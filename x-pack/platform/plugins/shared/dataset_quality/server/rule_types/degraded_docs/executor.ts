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
  ALERT_EVALUATION_VALUE,
  ALERT_GROUPING,
  ALERT_KEY_JOINER,
  ALERT_REASON,
} from '@kbn/rule-data-utils';
import { Comparator } from '@kbn/stack-alerts-plugin/common/comparator_types';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import { _IGNORED } from '../../../common/es_fields';
import { generateContext } from '../context';
import { getDocsStats } from '../get_docs_stats';
import {
  AdditionalContext,
  THRESHOLD_MET_GROUP,
  type DatasetQualityAlert,
  type DatasetQualityAlertContext,
  type DatasetQualityAlertState,
  type DatasetQualityAllowedActionGroups,
  type DatasetQualityRuleParams,
  type DatasetQualityRuleTypeState,
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

export const getRuleExecutor = (locatorsClient?: LocatorClient) =>
  async function executor(
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
  > {
    const { services, params, logger, getTimeRange } = options;
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

      const groupByFields: AdditionalContext = {};
      const groupBy = params.groupBy ?? [];

      for (let i = 0; i < bucketKey.length; i++) {
        const fieldName = groupBy[i];
        groupByFields[fieldName] = bucketKey[i];
      }

      if (generatedAlerts < alertLimit) {
        const context = generateContext({
          group: alertId,
          dateStart,
          dateEnd,
          value: percentage.toFixed(2),
          params,
          grouping: groupByFields,
          locatorsClient,
        });
        alertsClient.report({
          id: alertId,
          actionGroup: THRESHOLD_MET_GROUP.id,
          state: {},
          context,
          payload: {
            [ALERT_REASON]: context.reason,
            [ALERT_EVALUATION_VALUE]: `${context.value}`,
            [ALERT_EVALUATION_THRESHOLD]:
              params.threshold?.length === 1 ? params.threshold[0] : null,
            [ALERT_GROUPING]: groupByFields,
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

      const grouping = recoveredAlert.hit?.[ALERT_GROUPING];
      const percentage = unmetGroupValues[alertId] ?? '0';
      const recoveryContext = generateContext({
        group: alertId,
        dateStart,
        dateEnd,
        value: percentage,
        params,
        grouping,
        locatorsClient,
      });

      alertsClient.setAlertData({
        id: alertId,
        context: recoveryContext,
        payload: {
          [ALERT_REASON]: recoveryContext.reason,
          [ALERT_EVALUATION_VALUE]: `${recoveryContext.value}`,
          [ALERT_EVALUATION_THRESHOLD]: params.threshold?.length === 1 ? params.threshold[0] : null,
          [ALERT_GROUPING]: grouping,
        },
      });
    }

    return { state: {} };
  };
