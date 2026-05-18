/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleKind } from '@kbn/alerting-v2-schemas';
import { i18n } from '@kbn/i18n';
import type {
  StateTransitionDelayMode,
  RecoveryPolicy,
  StateTransition,
  RuleArtifact,
} from '../../form/types';
import type { DataSourceFormValues } from '../shared/types';

export enum Aggregation {
  COUNT = 'count',
  AVG = 'avg',
  SUM = 'sum',
  MIN = 'min',
  MAX = 'max',
  CARDINALITY = 'cardinality',
  P95 = 'p95',
  P99 = 'p99',
}

export enum Comparator {
  GT = '>',
  GTE = '>=',
  LT = '<',
  LTE = '<=',
  BETWEEN = 'between',
  NOT_BETWEEN = 'not_between',
}

export type ConditionOperator = 'AND' | 'OR';

export interface StatDefinition {
  id: string;
  label: string;
  aggregation: Aggregation;
  field?: string;
  filter?: string;
}

export interface EvaluationDefinition {
  id: string;
  label: string;
  expression: string;
}

export interface AlertCondition {
  id: string;
  metric: string;
  comparator: Comparator;
  threshold: number[];
}

export interface ThresholdRuleFormValues extends DataSourceFormValues {
  kind: RuleKind;
  metadata: {
    name: string;
    description?: string;
    tags?: string[];
  };
  stats: StatDefinition[];
  evaluations: EvaluationDefinition[];
  alertConditions: AlertCondition[];
  conditionOperator: ConditionOperator;
  schedule: {
    every: string;
    lookback: string;
  };
  recoveryPolicy?: RecoveryPolicy;
  stateTransition?: StateTransition;
  stateTransitionAlertDelayMode: StateTransitionDelayMode;
  stateTransitionRecoveryDelayMode: StateTransitionDelayMode;
  artifacts?: RuleArtifact[];
}

export const RULE_BUILDER_TYPE = 'threshold' as const;

export const DEFAULT_STAT: Omit<StatDefinition, 'id'> = {
  label: 'count',
  aggregation: Aggregation.COUNT,
};

export const DEFAULT_ALERT_CONDITION: Omit<AlertCondition, 'id'> = {
  metric: 'count',
  comparator: Comparator.GT,
  threshold: [100],
};

export const AGGREGATION_LABELS: Record<Aggregation, string> = {
  [Aggregation.COUNT]: i18n.translate(
    'xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.count',
    {
      defaultMessage: 'Count',
    }
  ),
  [Aggregation.AVG]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.avg', {
    defaultMessage: 'Average',
  }),
  [Aggregation.SUM]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.sum', {
    defaultMessage: 'Sum',
  }),
  [Aggregation.MIN]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.min', {
    defaultMessage: 'Min',
  }),
  [Aggregation.MAX]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.max', {
    defaultMessage: 'Max',
  }),
  [Aggregation.CARDINALITY]: i18n.translate(
    'xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.cardinality',
    {
      defaultMessage: 'Cardinality',
    }
  ),
  [Aggregation.P95]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.p95', {
    defaultMessage: 'P95',
  }),
  [Aggregation.P99]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.aggregation.p99', {
    defaultMessage: 'P99',
  }),
};

export const COMPARATOR_LABELS: Record<Comparator, string> = {
  [Comparator.GT]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.comparator.gt', {
    defaultMessage: 'is above',
  }),
  [Comparator.GTE]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.comparator.gte', {
    defaultMessage: 'is above or equals',
  }),
  [Comparator.LT]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.comparator.lt', {
    defaultMessage: 'is below',
  }),
  [Comparator.LTE]: i18n.translate('xpack.alertingV2.ruleBuilder.thresholdAlert.comparator.lte', {
    defaultMessage: 'is below or equals',
  }),
  [Comparator.BETWEEN]: i18n.translate(
    'xpack.alertingV2.ruleBuilder.thresholdAlert.comparator.between',
    {
      defaultMessage: 'is between',
    }
  ),
  [Comparator.NOT_BETWEEN]: i18n.translate(
    'xpack.alertingV2.ruleBuilder.thresholdAlert.comparator.notBetween',
    {
      defaultMessage: 'is not between',
    }
  ),
};

export const AGGREGATIONS_REQUIRING_FIELD: Aggregation[] = [
  Aggregation.AVG,
  Aggregation.SUM,
  Aggregation.MIN,
  Aggregation.MAX,
  Aggregation.CARDINALITY,
  Aggregation.P95,
  Aggregation.P99,
];

export const deriveStatLabel = (
  aggregation: Aggregation,
  field?: string,
  existingLabels: string[] = []
): string => {
  const sanitized = field ? field.replace(/[^a-zA-Z0-9]/g, '_') : '';
  const base = sanitized ? `${aggregation}_${sanitized}` : aggregation;

  if (!existingLabels.includes(base)) return base;

  let suffix = 2;
  while (existingLabels.includes(`${base}_${suffix}`)) {
    suffix++;
  }
  return `${base}_${suffix}`;
};
