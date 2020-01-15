/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { pickBy } from 'lodash/fp';
import { SavedObject } from 'kibana/server';
import { INTERNAL_IDENTIFIER } from '../../../../../common/constants';
import {
  RuleAlertType,
  isAlertType,
  isAlertTypes,
  IRuleSavedAttributesSavedObjectAttributes,
  isRuleStatusFindType,
  isRuleStatusFindTypes,
  isRuleStatusSavedObjectType,
} from '../../rules/types';
import { OutputRuleAlertRest } from '../../types';
import {
  createBulkErrorObject,
  BulkError,
  createSuccessObject,
  ImportSuccessError,
  createImportErrorObject,
} from '../utils';

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
export const transformAlertToRule = (
  alert: RuleAlertType,
  ruleStatus?: SavedObject<IRuleSavedAttributesSavedObjectAttributes>
): Partial<OutputRuleAlertRest> => {
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
    timeline_title: alert.params.timelineTitle,
    meta: alert.params.meta,
    severity: alert.params.severity,
    updated_by: alert.updatedBy,
    tags: transformTags(alert.tags),
    to: alert.params.to,
    type: alert.params.type,
    threats: alert.params.threats,
    version: alert.params.version,
    status: ruleStatus?.attributes.status,
    status_date: ruleStatus?.attributes.statusDate,
    last_failure_at: ruleStatus?.attributes.lastFailureAt,
    last_success_at: ruleStatus?.attributes.lastSuccessAt,
    last_failure_message: ruleStatus?.attributes.lastFailureMessage,
    last_success_message: ruleStatus?.attributes.lastSuccessMessage,
  });
};

export const transformRulesToNdjson = (rules: Array<Partial<OutputRuleAlertRest>>): string => {
  if (rules.length !== 0) {
    const rulesString = rules.map(rule => JSON.stringify(rule)).join('\n');
    return `${rulesString}\n`;
  } else {
    return '';
  }
};

export const transformAlertsToRules = (
  alerts: RuleAlertType[]
): Array<Partial<OutputRuleAlertRest>> => {
  return alerts.map(alert => transformAlertToRule(alert));
};

export const transformFindAlertsOrError = (
  findResults: { data: unknown[] },
  ruleStatuses?: unknown[]
): unknown | Boom => {
  if (!ruleStatuses && isAlertTypes(findResults.data)) {
    findResults.data = findResults.data.map(alert => transformAlertToRule(alert));
    return findResults;
  }
  if (isAlertTypes(findResults.data) && isRuleStatusFindTypes(ruleStatuses)) {
    findResults.data = findResults.data.map((alert, idx) =>
      transformAlertToRule(alert, ruleStatuses[idx].saved_objects[0])
    );
    return findResults;
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};

export const transformOrError = (
  alert: unknown,
  ruleStatus?: unknown
): Partial<OutputRuleAlertRest> | Boom => {
  if (!ruleStatus && isAlertType(alert)) {
    return transformAlertToRule(alert);
  }
  if (isAlertType(alert) && isRuleStatusFindType(ruleStatus)) {
    return transformAlertToRule(alert, ruleStatus.saved_objects[0]);
  } else if (isAlertType(alert) && isRuleStatusSavedObjectType(ruleStatus)) {
    return transformAlertToRule(alert, ruleStatus);
  } else {
    return new Boom('Internal error transforming', { statusCode: 500 });
  }
};

export const transformOrBulkError = (
  ruleId: string,
  alert: unknown,
  ruleStatus?: unknown
): Partial<OutputRuleAlertRest> | BulkError => {
  if (isAlertType(alert)) {
    if (isRuleStatusFindType(ruleStatus)) {
      return transformAlertToRule(alert, ruleStatus?.saved_objects[0] ?? ruleStatus);
    } else {
      return transformAlertToRule(alert);
    }
  } else {
    return createBulkErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
    });
  }
};

export const transformOrImportError = (
  ruleId: string,
  alert: unknown,
  existingImportSuccessError: ImportSuccessError
): ImportSuccessError => {
  if (isAlertType(alert)) {
    return createSuccessObject(existingImportSuccessError);
  } else {
    return createImportErrorObject({
      ruleId,
      statusCode: 500,
      message: 'Internal error transforming',
      existingImportSuccessError,
    });
  }
};
