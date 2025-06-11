/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertsClientError, ExecutorType, RuleExecutorOptions } from '@kbn/alerting-plugin/server';
import { i18n } from '@kbn/i18n';
import { ComparatorFns, TimeUnitChar } from '@kbn/response-ops-rule-params/common/utils';
import {
  ALERT_EVALUATION_THRESHOLD,
  ALERT_EVALUATION_VALUES,
  ALERT_REASON,
  ALERT_KEY_JOINER,
} from '@kbn/rule-data-utils';
import { Comparator } from '@kbn/stack-alerts-plugin/common/comparator_types';
import { INDEX, _IGNORED } from '../../../common/es_fields';
import { generateContext } from '../context';
import { getDocsStats } from '../get_docs_stats';
import {
  ALERT_EVALUATION_CONDITIONS,
  ALERT_TITLE,
  DATASET_QUALITY_DATASTREAM_NAME,
  THRESHOLD_MET_GROUP,
  type DatasetQualityAlert,
  type DatasetQualityAlertContext,
  type DatasetQualityAlertState,
  type DatasetQualityAllowedActionGroups,
  type DatasetQualityRuleParams,
  type DatasetQualityRuleTypeState,
  AdditionalContext,
} from '../types';

export const formatDurationFromTimeUnitChar = (time: number, unit: TimeUnitChar): string => {
  const sForPlural = time !== 0 && time > 1 ? 's' : '';
  switch (unit) {
    case 's':
      return `${time} sec${sForPlural}`;
    case 'm':
      return `${time} min${sForPlural}`;
    case 'h':
      return `${time} hr${sForPlural}`;
    case 'd':
      return `${time} day${sForPlural}`;
    default:
      return `${time} ${unit}`;
  }
};

export const executor = async (
  options: RuleExecutorOptions<
    DatasetQualityRuleParams,
    DatasetQualityRuleTypeState,
    DatasetQualityAlertState,
    DatasetQualityAlertContext,
    DatasetQualityAllowedActionGroups,
    DatasetQualityAlert
  >
): ReturnType<
  ExecutorType<
    DatasetQualityRuleParams,
    DatasetQualityRuleTypeState,
    DatasetQualityAlertState,
    DatasetQualityAlertContext,
    DatasetQualityAllowedActionGroups
  >
> => {
  const {
    rule: { name },
    services,
    params,
    logger,
    getTimeRange,
  } = options;
  const { alertsClient, scopedClusterClient } = services;

  if (!alertsClient) {
    throw new AlertsClientError();
  }

  const alertLimit = alertsClient.getAlertLimitValue();

  const { dateStart, dateEnd } = getTimeRange(`${params.timeSize}${params.timeUnit}`);
  const index = params.searchConfiguration.index;

  const datasetQualityDegradedResults = await getDocsStats({
    index,
    dateStart,
    groupBy: params.groupBy ?? [],
    query: {
      must: { exists: { field: _IGNORED } },
    },
    scopedClusterClient,
  });

  const unmetGroupValues: Record<string, string> = {};
  const compareFn = ComparatorFns.get(params.comparator as Comparator);
  if (compareFn == null) {
    throw new Error(
      i18n.translate('xpack.datasetQuality.rule.invalidComparatorErrorMessage', {
        defaultMessage: 'invalid thresholdComparator specified: {comparator}',
        values: {
          comparator: params.comparator,
        },
      })
    );
  }

  let generatedAlerts = 0;
  for (const groupResult of datasetQualityDegradedResults) {
    const { bucketKey, percentage } = groupResult;
    const alertId = bucketKey.join(ALERT_KEY_JOINER);
    const met = compareFn(percentage, params.threshold);

    if (!met) {
      unmetGroupValues[alertId] = percentage.toFixed(2);
      continue;
    }

    const groupByFields: AdditionalContext = bucketKey.reduce((acc, field, i) => {
      const fieldName = (params.groupBy ?? [])[i];
      return {
        ...acc,
        [fieldName === INDEX ? DATASET_QUALITY_DATASTREAM_NAME : fieldName]: field, // _index is reserved for the actual alerts index
      };
    }, {});

    if (generatedAlerts < alertLimit) {
      const context = generateContext(name, alertId, dateEnd, percentage.toFixed(2), params);
      alertsClient.report({
        id: alertId,
        actionGroup: THRESHOLD_MET_GROUP.id,
        state: {},
        context,
        payload: {
          [ALERT_REASON]: context.message,
          [ALERT_TITLE]: context.title,
          [ALERT_EVALUATION_VALUES]: `${context.value}`,
          [ALERT_EVALUATION_CONDITIONS]: context.conditions,
          [ALERT_EVALUATION_THRESHOLD]: params.threshold?.length === 1 ? params.threshold[0] : null,
          ...groupByFields,
        },
      });
    }

    generatedAlerts++;
  }

  alertsClient.setAlertLimitReached(generatedAlerts >= alertLimit);

  // Handle recovered alerts context
  const { getRecoveredAlerts } = alertsClient;
  for (const recoveredAlert of getRecoveredAlerts()) {
    const alertId = recoveredAlert.alert.getId();
    logger.debug(`setting context for recovered alert ${alertId}`);

    const percentage = unmetGroupValues[alertId] ?? '0';
    const recoveryContext = generateContext(name, alertId, dateEnd, percentage, params, true);

    alertsClient.setAlertData({
      id: alertId,
      context: recoveryContext,
      payload: {
        [ALERT_REASON]: recoveryContext.message,
        [ALERT_TITLE]: recoveryContext.title,
        [ALERT_EVALUATION_VALUES]: `${recoveryContext.value}`,
        [ALERT_EVALUATION_CONDITIONS]: recoveryContext.conditions,
        [ALERT_EVALUATION_THRESHOLD]: params.threshold?.length === 1 ? params.threshold[0] : null,
      },
    });
  }

  return { state: {} };
};
