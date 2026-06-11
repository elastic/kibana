/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreStart,
  ElasticsearchClient,
  Logger,
  SavedObjectsClientContract,
} from '@kbn/core/server';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { DataStreamClient } from '@kbn/data-streams';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import {
  knowledgeIndicatorsDataStream,
  type StoredKnowledgeIndicator,
  type knowledgeIndicatorsMappings,
} from './data_stream';
import {
  KnowledgeIndicatorClient,
  type KnowledgeIndicatorDataStreamClient,
} from './knowledge_indicator_client';
import {
  DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  type SigEventsTuningConfig,
} from '../../../../common/sig_events_tuning_config';
import {
  createDualCleanupRulesClient,
  readSignificantEventsAlertingV2ActiveFromClients,
} from '../../sig_events/create_sig_events_rules_management_client';

export class KnowledgeIndicatorService {
  constructor(private readonly coreStart: CoreStart, private readonly logger: Logger) {}

  async getClient({
    esClient,
    soClient,
    alertingRulesClient,
    alertingV2RulesClient,
    config = DEFAULT_SIG_EVENTS_TUNING_CONFIG,
  }: {
    esClient: ElasticsearchClient;
    soClient: SavedObjectsClientContract;
    alertingRulesClient: RulesClient;
    alertingV2RulesClient?: RulesClientApi;
    config?: Pick<
      SigEventsTuningConfig,
      'semantic_min_score' | 'rrf_rank_constant' | 'feature_ttl_days'
    >;
  }): Promise<KnowledgeIndicatorClient> {
    const uiSettings = this.coreStart.uiSettings.asScopedToClient(soClient);
    const [isSignificantEventsEnabled, { alertingV2Active }] = await Promise.all([
      uiSettings.get(OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS).then((v) => v ?? false),
      readSignificantEventsAlertingV2ActiveFromClients({
        uiSettingsClient: uiSettings,
        alertingV2RulesClient,
        logger: this.logger,
      }),
    ]);

    const dataStreamClient: KnowledgeIndicatorDataStreamClient = DataStreamClient.fromDefinition<
      typeof knowledgeIndicatorsMappings,
      StoredKnowledgeIndicator & Record<string, unknown>
    >({
      dataStream: knowledgeIndicatorsDataStream,
      elasticsearchClient: esClient,
    });

    const rulesManagementClient = createDualCleanupRulesClient({
      alertingV2Active,
      alertingRulesClient,
      alertingV2RulesClient,
      logger: this.logger,
    });

    return new KnowledgeIndicatorClient(
      {
        dataStreamClient,
        esClient,
        rulesManagementClient,
        soClient,
        logger: this.logger.get('knowledge_indicators'),
      },
      isSignificantEventsEnabled,
      config
    );
  }
}
