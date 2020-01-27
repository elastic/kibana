/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pickBy } from 'lodash/fp';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import { RuleAlertType, isAlertType, isAlertTypes } from '../../rules/types';
import { OutputRuleAlertRest } from '../../types';
import { createBulkErrorObject, BulkError } from '../utils';

export const getIdError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}) => {
  if (id != null) {
    return new Boom(`id: "${id}" not found`, { statusCode: 404 });
  } else if (ruleId != null) {
    return new Boom(`rule_id: "${ruleId}" not found`, { statusCode: 404 });
  } else {
    return new Boom(`id or rule_id should have been defined`, { statusCode: 404 });
  }
};

export const getIdBulkError = ({
  id,
  ruleId,
}: {
  id: string | undefined | null;
  ruleId: string | undefined | null;
}): BulkError => {
  if (id != null) {
    return createBulkErrorObject({
      ruleId: id,
      statusCode: 404,
      message: `id: "${id}" not found`,
    });
  } else if (ruleId != null) {
    return createBulkErrorObject({
      ruleId,
      statusCode: 404,
      message: `rule_id: "${ruleId}" not found`,
    });
  } else {
    return createBulkErrorObject({
      ruleId: '(unknown id)',
      statusCode: 404,
      message: `id or rule_id should have been defined`,
    });
  }
};

export const transformTags = (tags: string[]): string[] => {
  return tags.filter(tag => !tag.startsWith(INTERNAL_IDENTIFIER));
};

// Transforms the data but will remove any null or undefined it encounters and not include
// those on the export
export const transformAlertToRule = (alert: RuleAlertType): Partial<OutputRuleAlertRest> => {
  return pickBy<OutputRuleAlertRest>((value: unknown) => value != null, {
    created_at: alert.params.createdAt,
    updated_at: alert.params.updatedAt,
    created_by: alert.createdBy,
    description: alert.params.description,
    enabled: alert.enabled,
    false_positives: alert.params.falsePositives,
    filters: alert.params.filters,
    from: alert.params.from,
    id: alert.id,
    immutable: alert.params.immutable,
    index: alert.params.index,
    interval: alert.schedule.interval,
    rule_id: alert.params.ruleId,
    language: alert.params.language,
    output_index: alert.params.outputIndex,
    max_signals: alert.params.maxSignals,
    risk_score: alert.params.riskScore,
    name: alert.name,
    query: alert.params.query,
    references: alert.params.references,
    saved_id: alert.params.savedId,
    timeline_id: alert.params.timelineId,
    meta: alert.params.meta,
    severity: alert.params.severity,
    updated_by: alert.updatedBy,
    tags: transformTags(alert.tags),
    to: alert.params.to,
    type: alert.params.type,
    threats: alert.params.threats,
    version: alert.params.version,
  });
};

export const transformFindAlertsOrError = (findResults: { data: unknown[] }): unknown | Boom => {
  if (isAlertTypes(findResults.data)) {
    findResults.data = findResults.data.map(alert => transformAlertToRule(alert));
    return findResults;
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};

export const transformOrError = (alert: unknown): Partial<OutputRuleAlertRest> | Boom => {
  if (isAlertType(alert)) {
    return transformAlertToRule(alert);
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};

export const transformOrBulkError = (
  ruleId: string,
  alert: unknown
): Partial<OutputRuleAlertRest> | BulkError => {
  if (isAlertType(alert)) {
    return transformAlertToRule(alert);
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};
