/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';

import { ALERT_RULE_EXECUTION_UUID } from '@kbn/rule-data-utils';

import {
  ALERT_ATTACK_DISCOVERY_ALERT_IDS,
  ALERT_ATTACK_DISCOVERY_API_CONFIG,
  ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN,
  ALERT_ATTACK_DISCOVERY_TITLE,
} from '../../../schedules/field_names';
import type { AttackDiscoveryAlertDocument } from '../../../schedules/types';

/**
 * Returns array of missing field names for debugging.
 *
 * Note: ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT is not checked because:
 * - It's not present in workflow-generated discoveries
 * - It's only used for display/informational purposes, not required for functionality
 */
export const getMissingFields = (
  hit: estypes.SearchHit<AttackDiscoveryAlertDocument>
): string[] => {
  if (hit._source == null) {
    return ['_source']; // Can't check other fields if _source is null
  }

  const apiConfig = hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG];

  const apiConfigFields =
    apiConfig == null
      ? [ALERT_ATTACK_DISCOVERY_API_CONFIG]
      : [
          ...(apiConfig.action_type_id == null
            ? [`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.action_type_id`]
            : []),
          ...(apiConfig.connector_id == null
            ? [`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.connector_id`]
            : []),
          ...(apiConfig.name == null ? [`${ALERT_ATTACK_DISCOVERY_API_CONFIG}.name`] : []),
        ];

  return [
    ...(hit._id == null ? ['_id'] : []),
    ...(hit._source['@timestamp'] == null ? ['@timestamp'] : []),
    ...(!Array.isArray(hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS])
      ? [`${ALERT_ATTACK_DISCOVERY_ALERT_IDS} (not an array)`]
      : []),
    ...apiConfigFields,
    ...(hit._source[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] == null
      ? [ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN]
      : []),
    ...(hit._source[ALERT_RULE_EXECUTION_UUID] == null ? [ALERT_RULE_EXECUTION_UUID] : []),
    ...(hit._source[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN] == null
      ? [ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN]
      : []),
    ...(hit._source[ALERT_ATTACK_DISCOVERY_TITLE] == null ? [ALERT_ATTACK_DISCOVERY_TITLE] : []),
  ];
};

/**
 * Returns `true` if the document is missing fields required to create an `AttackDiscoveryAlert`.
 *
 * Note: ALERT_ATTACK_DISCOVERY_ALERTS_CONTEXT_COUNT is not checked because:
 * - It's not present in workflow-generated discoveries
 * - It's only used for display/informational purposes, not required for functionality
 */
export const isMissingRequiredFields = (
  hit: estypes.SearchHit<AttackDiscoveryAlertDocument>
): boolean =>
  hit._source == null ||
  hit._source['@timestamp'] == null ||
  !Array.isArray(hit._source[ALERT_ATTACK_DISCOVERY_ALERT_IDS]) ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG] == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG].action_type_id == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG].connector_id == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_API_CONFIG].name == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_DETAILS_MARKDOWN] == null ||
  hit._source[ALERT_RULE_EXECUTION_UUID] == null ||
  hit._id == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_SUMMARY_MARKDOWN] == null ||
  hit._source[ALERT_ATTACK_DISCOVERY_TITLE] == null;
