/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import type { QueryLink } from '@kbn/streams-schema';
import { resolveAlertsSource } from '../../../routes/utils/resolve_alerts_source';
import {
  type AlertsSource,
  V1_ALERTS_SOURCE,
  V2_ALERTS_SOURCE,
} from '../read_significant_events_from_alerts_indices';
import { ALERTS_DATA_STREAM, RULE_EVENTS_DATA_STREAM } from '../alerts_data_stream';

export interface ResolvedDetectionAlertsSource {
  alertsSource: AlertsSource;
  alertIndex: string;
}

export async function resolveDetectionAlertsSource({
  uiSettingsClient,
  alertingV2RulesClient,
  logger,
}: {
  uiSettingsClient: IUiSettingsClient;
  alertingV2RulesClient?: RulesClientApi;
  logger: Logger;
}): Promise<ResolvedDetectionAlertsSource> {
  const alertsSource = await resolveAlertsSource({
    uiSettingsClient,
    alertingV2RulesClient,
    logger,
  });

  return {
    alertsSource,
    alertIndex: alertsSource === V2_ALERTS_SOURCE ? RULE_EVENTS_DATA_STREAM : ALERTS_DATA_STREAM,
  };
}

export interface RuleMetadata {
  ruleName: string;
  streamName: string;
}

export function buildRuleMetadataMap(queryLinks: QueryLink[]): Map<string, RuleMetadata> {
  const map = new Map<string, RuleMetadata>();
  for (const link of queryLinks) {
    map.set(link.rule_id, {
      ruleName: link.query.title,
      streamName: link.stream_name,
    });
  }
  return map;
}

export { V1_ALERTS_SOURCE, V2_ALERTS_SOURCE };
