/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  Aggregation,
  Comparator,
  type ReservedSeverityLabelSource,
  type SeverityValidationError,
} from './form_types';

export const AGGREGATION_OPTIONS = [
  {
    value: Aggregation.COUNT,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.count', { defaultMessage: 'Count' }),
  },
  {
    value: Aggregation.AVG,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.avg', { defaultMessage: 'Average' }),
  },
  {
    value: Aggregation.SUM,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.sum', { defaultMessage: 'Sum' }),
  },
  {
    value: Aggregation.MIN,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.min', { defaultMessage: 'Min' }),
  },
  {
    value: Aggregation.MAX,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.max', { defaultMessage: 'Max' }),
  },
  {
    value: Aggregation.CARDINALITY,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.cardinality', {
      defaultMessage: 'Cardinality',
    }),
  },
  {
    value: Aggregation.P95,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.p95', { defaultMessage: 'P95' }),
  },
  {
    value: Aggregation.P99,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.agg.p99', { defaultMessage: 'P99' }),
  },
];

export const COMPARATOR_OPTIONS = [
  {
    value: Comparator.GT,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.comparator.gt', {
      defaultMessage: 'is above',
    }),
  },
  {
    value: Comparator.GTE,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.comparator.gte', {
      defaultMessage: 'is above or equals',
    }),
  },
  {
    value: Comparator.LT,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.comparator.lt', {
      defaultMessage: 'is below',
    }),
  },
  {
    value: Comparator.LTE,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.comparator.lte', {
      defaultMessage: 'is below or equals',
    }),
  },
  {
    value: Comparator.BETWEEN,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.comparator.between', {
      defaultMessage: 'is between',
    }),
  },
  {
    value: Comparator.NOT_BETWEEN,
    text: i18n.translate('xpack.alertingV2.ruleBuilder.comparator.notBetween', {
      defaultMessage: 'is not between',
    }),
  },
];

export const CONDITION_OPERATOR_OPTIONS = [
  {
    id: 'AND',
    label: i18n.translate('xpack.alertingV2.ruleBuilder.conditionOperator.and', {
      defaultMessage: 'AND',
    }),
  },
  {
    id: 'OR',
    label: i18n.translate('xpack.alertingV2.ruleBuilder.conditionOperator.or', {
      defaultMessage: 'OR',
    }),
  },
];

export const SEVERITY_LEVEL_OPTIONS = [
  {
    value: 'info',
    text: i18n.translate('xpack.alertingV2.ruleBuilder.severity.level.info', {
      defaultMessage: 'Info',
    }),
  },
  {
    value: 'low',
    text: i18n.translate('xpack.alertingV2.ruleBuilder.severity.level.low', {
      defaultMessage: 'Low',
    }),
  },
  {
    value: 'medium',
    text: i18n.translate('xpack.alertingV2.ruleBuilder.severity.level.medium', {
      defaultMessage: 'Medium',
    }),
  },
  {
    value: 'high',
    text: i18n.translate('xpack.alertingV2.ruleBuilder.severity.level.high', {
      defaultMessage: 'High',
    }),
  },
  {
    value: 'critical',
    text: i18n.translate('xpack.alertingV2.ruleBuilder.severity.level.critical', {
      defaultMessage: 'Critical',
    }),
  },
];

export const SEVERITY_VALIDATION_ERRORS: Record<SeverityValidationError, string> = {
  invalid_threshold: i18n.translate(
    'xpack.alertingV2.ruleBuilder.severity.error.invalidThreshold',
    {
      defaultMessage: 'Each severity level needs a valid numeric threshold.',
    }
  ),
  duplicate_level: i18n.translate('xpack.alertingV2.ruleBuilder.severity.error.duplicateLevel', {
    defaultMessage: 'Each severity level can only be used once.',
  }),
  duplicate_threshold: i18n.translate(
    'xpack.alertingV2.ruleBuilder.severity.error.duplicateThreshold',
    { defaultMessage: 'Severity thresholds must be unique.' }
  ),
  threshold_order: i18n.translate('xpack.alertingV2.ruleBuilder.severity.error.thresholdOrder', {
    defaultMessage: 'More severe levels must have more severe thresholds.',
  }),
  threshold_below_condition: i18n.translate(
    'xpack.alertingV2.ruleBuilder.severity.error.thresholdBelowCondition',
    { defaultMessage: 'Severity thresholds must be beyond the alert condition threshold.' }
  ),
};

/**
 * Notice shown when severity is disabled because an input is named `severity`. Names the exact
 * source and its remediation (rename a stat/evaluation label; remove or change a group-by field);
 * falls back to listing all sources when more than one collides at once.
 */
export const SEVERITY_RESERVED_LABEL_NOTICE = (sources: ReservedSeverityLabelSource[]): string => {
  if (sources.length === 1) {
    if (sources[0] === 'stat') {
      return i18n.translate('xpack.alertingV2.ruleBuilder.severity.reservedLabelNotice.stat', {
        defaultMessage:
          'Severity levels are not configurable while a stat is named "severity". Rename it to enable them.',
      });
    }
    if (sources[0] === 'evaluation') {
      return i18n.translate(
        'xpack.alertingV2.ruleBuilder.severity.reservedLabelNotice.evaluation',
        {
          defaultMessage:
            'Severity levels are not configurable while an evaluation is named "severity". Rename it to enable them.',
        }
      );
    }
    return i18n.translate('xpack.alertingV2.ruleBuilder.severity.reservedLabelNotice.groupBy', {
      defaultMessage:
        'Severity levels are not configurable while a group-by field named "severity" is used. Remove it or use a different field to enable them.',
    });
  }
  return i18n.translate('xpack.alertingV2.ruleBuilder.severity.reservedLabelNotice', {
    defaultMessage:
      'Severity levels are not configurable while a stat, evaluation, or group-by field is named "severity". Rename it to enable them.',
  });
};

export const THRESHOLD_STEP_TITLE = i18n.translate(
  'xpack.alertingV2.ruleBuilder.threshold.stepTitle',
  { defaultMessage: 'Condition' }
);

export const THRESHOLD_CREATE_FLYOUT_TITLE = i18n.translate(
  'xpack.alertingV2.ruleBuilder.threshold.createFlyoutTitle',
  { defaultMessage: 'Create Threshold rule' }
);

export const STAT_LABEL_REQUIRED_ERROR = i18n.translate(
  'xpack.alertingV2.ruleBuilder.stats.labelRequiredError',
  { defaultMessage: 'Label is required.' }
);

export const STAT_FIELD_REQUIRED_ERROR = i18n.translate(
  'xpack.alertingV2.ruleBuilder.stats.fieldRequiredError',
  { defaultMessage: 'Field is required.' }
);

export const EXPRESSION_UNKNOWN_REFERENCE_ERROR = (unknownLabels: string[]) =>
  i18n.translate('xpack.alertingV2.ruleBuilder.evaluations.unknownReferenceError', {
    defaultMessage: 'References unknown {count, plural, one {label} other {labels}}: {labels}',
    values: { count: unknownLabels.length, labels: unknownLabels.join(', ') },
  });
