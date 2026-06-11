/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { QueryLink } from '@kbn/streams-schema';
import pLimit from 'p-limit';
import type { StreamsPluginStartDependencies } from '../../../types';
import { KnowledgeIndicatorService } from '../../streams/ki/knowledge_indicator_service';
import { toCreateRuleBody } from '../../streams/ki/knowledge_indicator_client/rule_orchestration';
import type { IRulesManagementClient } from '../../streams/ki/knowledge_indicator_client/rules/rules_management_client';
import {
  createDualCleanupRulesClient,
  resolveSignificantEventsAlertingV2State,
} from '../create_sig_events_rules_management_client';
import { getSigEventsTuningConfig } from '../helpers/get_sig_events_tuning_config';
import { createInternalKibanaRequest } from './create_internal_kibana_request';
import {
  SigEventsV2MigrationStateStore,
  type SigEventsV2MigrationFailure,
  type SigEventsV2MigrationState,
} from './migration_state';

const MIGRATION_CONCURRENCY = 5;

export interface RunSignificantEventsV2MigrationResult {
  skipped: boolean;
  reason?: string;
  state: SigEventsV2MigrationState;
}

export async function runSignificantEventsV2Migration({
  coreStart,
  pluginsStart,
  logger,
}: {
  coreStart: CoreStart;
  pluginsStart: StreamsPluginStartDependencies;
  logger: Logger;
}): Promise<RunSignificantEventsV2MigrationResult> {
  const migrationLogger = logger.get('sigevents-v2-migration');
  const stateStore = new SigEventsV2MigrationStateStore(
    coreStart.elasticsearch.client.asInternalUser,
    migrationLogger
  );

  const existingState = await stateStore.getState();
  if (existingState.status === 'completed' && existingState.failed_queries.length === 0) {
    migrationLogger.debug('SigEvents v2 migration already completed — skipping');
    return { skipped: true, reason: 'already_completed', state: existingState };
  }

  const soClient = coreStart.savedObjects.getUnsafeInternalClient();
  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(soClient);
  const globalUiSettingsClient = coreStart.uiSettings.globalAsScopedToClient(soClient);

  const [isSignificantEventsEnabled, tuningConfig] = await Promise.all([
    uiSettingsClient
      .get<boolean>(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS)
      .then((v) => v ?? false),
    getSigEventsTuningConfig(globalUiSettingsClient, migrationLogger),
  ]);

  if (!isSignificantEventsEnabled) {
    migrationLogger.debug('Significant Events disabled — skipping v2 migration');
    return { skipped: true, reason: 'sigevents_disabled', state: existingState };
  }

  const request = createInternalKibanaRequest();
  const { alertingV2Active, alertingV2RulesClient } =
    await resolveSignificantEventsAlertingV2State({
      uiSettingsClient,
      alertingVTwo: pluginsStart.alertingVTwo,
      request,
      logger: migrationLogger,
    });

  if (!alertingV2Active || !alertingV2RulesClient) {
    migrationLogger.debug('Alerting v2 architecture inactive — skipping migration');
    return { skipped: true, reason: 'v2_inactive', state: existingState };
  }

  const v1RulesClient = await pluginsStart.alerting.getRulesClientWithRequestInSpace(
    request,
    DEFAULT_SPACE_ID
  );

  const esClient = coreStart.elasticsearch.client.asInternalUser;
  const kiService = new KnowledgeIndicatorService(coreStart, migrationLogger);
  const kiClient = await kiService.getClient({
    esClient,
    soClient,
    alertingRulesClient: v1RulesClient,
    alertingV2RulesClient,
    config: tuningConfig,
  });

  const ruleBackedLinks = await kiClient.getRuleBackedQueryLinks();
  if (ruleBackedLinks.length === 0) {
    const completedAt = new Date().toISOString();
    const payload = {
      migrated_count: 0,
      failed_queries: [],
      completed_at: completedAt,
      last_run_at: completedAt,
    };
    await stateStore.markCompleted(payload);
    migrationLogger.info('SigEvents v2 migration: no rule-backed queries to migrate');
    return {
      skipped: false,
      state: {
        status: 'completed',
        migrated_count: 0,
        failed_queries: [],
        completed_at: completedAt,
        last_run_at: completedAt,
      },
    };
  }

  await stateStore.markInProgress();

  const rulesManagementClient = createDualCleanupRulesClient({
    alertingV2Active: true,
    alertingRulesClient: v1RulesClient,
    alertingV2RulesClient,
    logger: migrationLogger,
  });
  const limiter = pLimit(MIGRATION_CONCURRENCY);

  let migratedCount = 0;
  const failedQueries: SigEventsV2MigrationFailure[] = [];

  await Promise.all(
    ruleBackedLinks.map((link) =>
      limiter(async () => {
        try {
          await migrateQueryLink({ link, rulesManagementClient });
          migratedCount += 1;
        } catch (error) {
          failedQueries.push({
            stream_name: link.stream_name,
            query_id: link.query.id,
            rule_id: link.rule_id,
            error: error instanceof Error ? error.message : String(error),
          });
          migrationLogger.warn(
            `Failed to migrate query ${link.query.id} on stream ${link.stream_name}: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
      })
    )
  );

  const completedAt = new Date().toISOString();
  const payload = {
    migrated_count: migratedCount,
    failed_queries: failedQueries,
    completed_at: completedAt,
    last_run_at: completedAt,
  };

  if (failedQueries.length > 0) {
    await stateStore.markFailed(payload);
    migrationLogger.warn(
      `SigEvents v2 migration finished with ${failedQueries.length} failure(s), ${migratedCount} succeeded`
    );
    return {
      skipped: false,
      state: {
        status: 'failed',
        migrated_count: migratedCount,
        failed_queries: failedQueries,
        completed_at: completedAt,
        last_run_at: completedAt,
      },
    };
  }

  await stateStore.markCompleted(payload);
  migrationLogger.info(`SigEvents v2 migration completed for ${migratedCount} rule-backed queries`);
  return {
    skipped: false,
    state: {
      status: 'completed',
      migrated_count: migratedCount,
      failed_queries: [],
      completed_at: completedAt,
      last_run_at: completedAt,
    },
  };
}

async function migrateQueryLink({
  link,
  rulesManagementClient,
}: {
  link: QueryLink;
  rulesManagementClient: IRulesManagementClient;
}): Promise<void> {
  await rulesManagementClient.createRule(link.rule_id, toCreateRuleBody(link));
}
