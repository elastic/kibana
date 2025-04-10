/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { getHumanReadableComparator } from '@kbn/stack-alerts-plugin/common';
import type { Comparator } from '@kbn/stack-alerts-plugin/common/comparator_types';
import { DatasetQualityRuleParams } from './types';

const generateTitle = (ruleName: string, group: string, isRecovered = false) =>
  i18n.translate('xpack.datasetQuality.rule.alertTypeContextTitle', {
    defaultMessage: `rule ''{name}'' {verb}`,
    values: {
      name: ruleName,
      verb: isRecovered ? 'recovered' : `matched query for group ${group}`,
    },
  });

const generateMessage = (
  value: string,
  group: string,
  timeSize: number,
  timeUnit: string,
  comparator: Comparator,
  threshold: number[]
) =>
  i18n.translate('xpack.datasetQuality.rule.alertTypeContextReasonDescription', {
    defaultMessage: `Degraded documents percentage is {value} in the last {window} for {group}. Alert when {comparator} {threshold}.`,
    values: {
      value,
      window: `${timeSize}${timeUnit}`,
      group,
      comparator: getHumanReadableComparator(comparator),
      threshold: threshold.join(' and '),
    },
  });

const generateConditions = (
  group: string,
  comparator: Comparator,
  threshold: number[],
  isRecovered = false
) =>
  i18n.translate('xpack.datasetQuality.rule.alertTypeContextConditionsDescription', {
    defaultMessage:
      'Degraded documents percentage for {group} is {negation}{thresholdComparator} {threshold}',
    values: {
      group,
      thresholdComparator: getHumanReadableComparator(comparator),
      threshold: threshold.join(' and '),
      negation: isRecovered ? 'NOT ' : '',
    },
  });

export const generateContext = (
  ruleName: string,
  group: string,
  date: string,
  value: string,
  params: DatasetQualityRuleParams,
  isRecovered = false
) => ({
  title: generateTitle(ruleName, group, isRecovered),
  date,
  group,
  value,
  message: generateMessage(
    value,
    group,
    params.timeSize,
    params.timeUnit,
    params.comparator as Comparator,
    params.threshold
  ),
  conditions: generateConditions(
    group,
    params.comparator as Comparator,
    params.threshold,
    isRecovered
  ),
});
