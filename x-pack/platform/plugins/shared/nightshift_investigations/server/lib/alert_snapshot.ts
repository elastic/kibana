/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AlertsClient } from '@kbn/rule-registry-plugin/server';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUE,
  ALERT_EVALUATION_VALUES,
  ALERT_FLAPPING,
  ALERT_GROUP,
  ALERT_GROUPING,
  ALERT_INDEX_PATTERN,
  ALERT_REASON,
  ALERT_RULE_CATEGORY,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  ALERT_START,
  ALERT_STATUS,
  ALERT_URL,
  ALERT_UUID,
  OBSERVABILITY_RULE_TYPE_IDS,
  STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import { alertSnapshotSchema, type AlertSnapshot } from '../../common';

const INVESTIGABLE_RULE_TYPE_IDS = [
  ...OBSERVABILITY_RULE_TYPE_IDS,
  ...STACK_RULE_TYPE_IDS_SUPPORTED_BY_OBSERVABILITY,
];

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object' && !Array.isArray(value);

/**
 * Object-valued AAD fields that {@link parseAlertSnapshot} reads whole. Recursing into them would
 * shred `{ service: { name: 'checkout' } }` into `kibana.alert.grouping.service.name` and drop the
 * snapshot enrichment. Evaluation is flattened on purpose: parse reads the leaf dotted keys.
 */
const OBJECT_VALUED_AAD_FIELDS: ReadonlySet<string> = new Set([
  ALERT_GROUPING,
  ALERT_RULE_PARAMETERS,
]);

/**
 * AAD documents arrive nested (`kibana: { alert: { uuid } }`) from v1 rule-action events and
 * flattened (`'kibana.alert.uuid'` as a single key) from RAC. Flatten nested objects so
 * {@link parseAlertSnapshot} can read the same dotted field names in both cases. Arrays stay intact.
 */
const flattenAlertFields = (
  value: Record<string, unknown>,
  prefix = ''
): Record<string, unknown> => {
  const flattened: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(nested) && !OBJECT_VALUED_AAD_FIELDS.has(path)) {
      Object.assign(flattened, flattenAlertFields(nested, path));
    } else {
      flattened[path] = nested;
    }
  }
  return flattened;
};

/**
 * Accepts an investigation snapshot, a nested AAD document, a flattened AAD document, or a
 * `_source`-wrapped hit, and returns the snapshot the investigation brief is composed from.
 */
export const snapshotFromAlertDocument = (alert: unknown): AlertSnapshot | undefined => {
  if (!isPlainObject(alert)) {
    return undefined;
  }

  const asSnapshot = alertSnapshotSchema.safeParse(alert);
  if (asSnapshot.success) {
    return asSnapshot.data;
  }

  const source = isPlainObject(alert._source) ? alert._source : alert;
  const flattened = flattenAlertFields(source);
  if (flattened[ALERT_UUID] == null && typeof alert._id === 'string') {
    flattened[ALERT_UUID] = alert._id;
  }

  return parseAlertSnapshot(flattened);
};

export const parseAlertSnapshot = (alert: Record<string, unknown>): AlertSnapshot | undefined => {
  const value = alert[ALERT_EVALUATION_VALUES] ?? alert[ALERT_EVALUATION_VALUE];
  const threshold = alert[ALERT_EVALUATION_THRESHOLD];
  const result = alertSnapshotSchema.safeParse({
    id: alert[ALERT_UUID],
    rule_id: alert[ALERT_RULE_UUID],
    rule_name: alert[ALERT_RULE_NAME],
    rule_type_id: alert[ALERT_RULE_TYPE_ID],
    rule_category: alert[ALERT_RULE_CATEGORY],
    reason: alertSnapshotSchema.shape.reason.catch(undefined).parse(alert[ALERT_REASON]),
    status: alert[ALERT_STATUS],
    start: alert[ALERT_START] ?? alert[TIMESTAMP],
    timestamp: alertSnapshotSchema.shape.timestamp.catch(undefined).parse(alert[TIMESTAMP]),
    flapping: alertSnapshotSchema.shape.flapping.catch(undefined).parse(alert[ALERT_FLAPPING]),
    url: alertSnapshotSchema.shape.url.catch(undefined).parse(alert[ALERT_URL]),
    rule_tags: alertSnapshotSchema.shape.rule_tags.catch(undefined).parse(alert[ALERT_RULE_TAGS]),
    grouping: alertSnapshotSchema.shape.grouping.catch(undefined).parse(alert[ALERT_GROUPING]),
    group: alertSnapshotSchema.shape.group.catch(undefined).parse(alert[ALERT_GROUP]),
    evaluation: alertSnapshotSchema.shape.evaluation
      .catch(undefined)
      .parse(value !== undefined || threshold !== undefined ? { value, threshold } : undefined),
    rule_parameters: alertSnapshotSchema.shape.rule_parameters
      .catch(undefined)
      .parse(alert[ALERT_RULE_PARAMETERS]),
    index_pattern: alertSnapshotSchema.shape.index_pattern
      .catch(undefined)
      .parse(alert[ALERT_INDEX_PATTERN]),
  });

  return result.success ? result.data : undefined;
};

export const fetchAlertSnapshot = async (
  alertsClient: AlertsClient,
  alertId: string
): Promise<AlertSnapshot> => {
  const indices = (await alertsClient.getAuthorizedAlertsIndices(INVESTIGABLE_RULE_TYPE_IDS)) ?? [];
  if (!indices.length) {
    throw Boom.notFound(`Alert with id ${alertId} not found`);
  }

  const alert = await alertsClient.get({ id: alertId, index: indices.join(',') }).catch((error) => {
    if (Boom.isBoom(error) && error.output.statusCode === 404) {
      throw Boom.notFound(`Alert with id ${alertId} not found`);
    }
    throw error;
  });

  const snapshot = parseAlertSnapshot(alert);
  if (!snapshot) {
    throw Boom.badRequest('Alert does not contain the fields required for an investigation');
  }
  return snapshot;
};
