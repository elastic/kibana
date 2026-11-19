/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { MAX_METRICS_PER_PAGE } from '../../../common/constants';

export const TITLE = i18n.translate('xpack.cases.kpiMetrics.title', {
  defaultMessage: 'Case list metrics',
});

export const DESCRIPTION = i18n.translate('xpack.cases.kpiMetrics.description', {
  defaultMessage:
    'Select the metrics that show above the case list. You can show up to {max} metrics.',
  values: { max: MAX_METRICS_PER_PAGE },
});

export const DEFAULT_METRICS_NOTE = i18n.translate('xpack.cases.kpiMetrics.defaultMetricsNote', {
  defaultMessage: 'The case list shows the default metrics. A change saves your own list.',
});

export const NO_METRICS = i18n.translate('xpack.cases.kpiMetrics.noMetrics', {
  defaultMessage: 'The case list shows no metrics.',
});

export const ADD_METRIC = i18n.translate('xpack.cases.kpiMetrics.addMetric', {
  defaultMessage: 'Add metric',
});

export const EDIT_METRIC = i18n.translate('xpack.cases.kpiMetrics.editMetric', {
  defaultMessage: 'Edit metric',
});

export const DELETE_METRIC = i18n.translate('xpack.cases.kpiMetrics.deleteMetric', {
  defaultMessage: 'Delete metric',
});

export const MOVE_UP = i18n.translate('xpack.cases.kpiMetrics.moveUp', {
  defaultMessage: 'Move up',
});

export const MOVE_DOWN = i18n.translate('xpack.cases.kpiMetrics.moveDown', {
  defaultMessage: 'Move down',
});

export const MAX_METRICS_LIMIT = (max: number) =>
  i18n.translate('xpack.cases.kpiMetrics.maxMetricsLimit', {
    values: { max },
    defaultMessage: 'You can show a maximum of {max} metrics.',
  });

export const PREDEFINED = i18n.translate('xpack.cases.kpiMetrics.predefined', {
  defaultMessage: 'Predefined',
});

export const CUSTOM = i18n.translate('xpack.cases.kpiMetrics.custom', {
  defaultMessage: 'Custom',
});

export const KIND = i18n.translate('xpack.cases.kpiMetrics.kind', {
  defaultMessage: 'Metric type',
});

export const PREDEFINED_METRIC = i18n.translate('xpack.cases.kpiMetrics.predefinedMetric', {
  defaultMessage: 'Metric',
});

export const LABEL = i18n.translate('xpack.cases.kpiMetrics.label', {
  defaultMessage: 'Label',
});

export const INDEX = i18n.translate('xpack.cases.kpiMetrics.index', {
  defaultMessage: 'Data',
});

export const INDEX_CASES = i18n.translate('xpack.cases.kpiMetrics.indexCases', {
  defaultMessage: 'Cases',
});

export const INDEX_ACTIVITY = i18n.translate('xpack.cases.kpiMetrics.indexActivity', {
  defaultMessage: 'Case activity',
});

export const INDEX_ATTACHMENTS = i18n.translate('xpack.cases.kpiMetrics.indexAttachments', {
  defaultMessage: 'Case attachments',
});

export const DATE_FIELD = i18n.translate('xpack.cases.kpiMetrics.dateField', {
  defaultMessage: 'Filter dates by',
});

export const DATE_FIELD_CREATED_AT = i18n.translate('xpack.cases.kpiMetrics.dateFieldCreatedAt', {
  defaultMessage: 'Created date',
});

export const DATE_FIELD_CLOSED_AT = i18n.translate('xpack.cases.kpiMetrics.dateFieldClosedAt', {
  defaultMessage: 'Closed date',
});

export const DATE_FIELD_HELP = i18n.translate('xpack.cases.kpiMetrics.dateFieldHelp', {
  defaultMessage:
    'Closed date counts only cases closed in the selected range. The case table always uses the created date.',
});

export const QUERY = i18n.translate('xpack.cases.kpiMetrics.query', {
  defaultMessage: 'KQL query',
});

export const QUERY_HELP = (fields: string) =>
  i18n.translate('xpack.cases.kpiMetrics.queryHelp', {
    values: { fields },
    defaultMessage: 'Optional. Use the analytics field names. Available fields: {fields}',
  });

export const CASE_QUERY = i18n.translate('xpack.cases.kpiMetrics.caseQuery', {
  defaultMessage: 'Case query (KQL)',
});

export const CASE_QUERY_HELP = (fields: string) =>
  i18n.translate('xpack.cases.kpiMetrics.caseQueryHelp', {
    values: { fields },
    defaultMessage:
      'Optional. Only alerts of the cases that match the query are counted. Use the analytics field names. Available fields: {fields}',
  });

export const CASE_QUERY_INVALID = i18n.translate('xpack.cases.kpiMetrics.caseQueryInvalid', {
  defaultMessage: 'The case query is not valid KQL.',
});

export const AGGREGATION = i18n.translate('xpack.cases.kpiMetrics.aggregation', {
  defaultMessage: 'Calculation',
});

export const AGGREGATION_COUNT = i18n.translate('xpack.cases.kpiMetrics.aggregationCount', {
  defaultMessage: 'Count',
});

export const AGGREGATION_CARDINALITY = i18n.translate(
  'xpack.cases.kpiMetrics.aggregationCardinality',
  {
    defaultMessage: 'Unique count',
  }
);

export const AGGREGATION_SUM = i18n.translate('xpack.cases.kpiMetrics.aggregationSum', {
  defaultMessage: 'Sum',
});

export const AGGREGATION_AVG = i18n.translate('xpack.cases.kpiMetrics.aggregationAvg', {
  defaultMessage: 'Average',
});

export const AGGREGATION_MIN = i18n.translate('xpack.cases.kpiMetrics.aggregationMin', {
  defaultMessage: 'Minimum',
});

export const AGGREGATION_MAX = i18n.translate('xpack.cases.kpiMetrics.aggregationMax', {
  defaultMessage: 'Maximum',
});

export const AGGREGATION_MEDIAN = i18n.translate('xpack.cases.kpiMetrics.aggregationMedian', {
  defaultMessage: 'Median',
});

export const FIELD = i18n.translate('xpack.cases.kpiMetrics.field', {
  defaultMessage: 'Field',
});

export const THRESHOLD = i18n.translate('xpack.cases.kpiMetrics.threshold', {
  defaultMessage: 'Threshold',
});

export const THRESHOLD_NONE = i18n.translate('xpack.cases.kpiMetrics.thresholdNone', {
  defaultMessage: 'No threshold',
});

export const THRESHOLD_ABOVE = i18n.translate('xpack.cases.kpiMetrics.thresholdAbove', {
  defaultMessage: 'Danger above',
});

export const THRESHOLD_BELOW = i18n.translate('xpack.cases.kpiMetrics.thresholdBelow', {
  defaultMessage: 'Danger below',
});

export const THRESHOLD_VALUE = i18n.translate('xpack.cases.kpiMetrics.thresholdValue', {
  defaultMessage: 'Threshold value',
});

export const THRESHOLD_DURATION_HELP = i18n.translate(
  'xpack.cases.kpiMetrics.thresholdDurationHelp',
  {
    defaultMessage: 'This metric is a duration. Enter the value in the selected unit.',
  }
);

export const THRESHOLD_VALUE_NON_NEGATIVE = i18n.translate(
  'xpack.cases.kpiMetrics.thresholdValueNonNegative',
  {
    defaultMessage: 'Enter a value of 0 or more.',
  }
);

export const THRESHOLD_UNIT = i18n.translate('xpack.cases.kpiMetrics.thresholdUnit', {
  defaultMessage: 'Unit',
});

export const THRESHOLD_UNIT_MINUTES = i18n.translate(
  'xpack.cases.kpiMetrics.thresholdUnitMinutes',
  {
    defaultMessage: 'Minutes',
  }
);

export const THRESHOLD_UNIT_HOURS = i18n.translate('xpack.cases.kpiMetrics.thresholdUnitHours', {
  defaultMessage: 'Hours',
});

export const THRESHOLD_UNIT_DAYS = i18n.translate('xpack.cases.kpiMetrics.thresholdUnitDays', {
  defaultMessage: 'Days',
});

export const REQUIRED_LABEL = i18n.translate('xpack.cases.kpiMetrics.requiredLabel', {
  defaultMessage: 'A label is required.',
});

export const REQUIRED_FIELD = i18n.translate('xpack.cases.kpiMetrics.requiredField', {
  defaultMessage: 'A field is required for this calculation.',
});

export const MAX_LENGTH_ERROR = (max: number) =>
  i18n.translate('xpack.cases.kpiMetrics.maxLengthError', {
    values: { max },
    defaultMessage: 'The maximum length is {max} characters.',
  });

export const CANCEL = i18n.translate('xpack.cases.kpiMetrics.cancel', {
  defaultMessage: 'Cancel',
});

export const SAVE = i18n.translate('xpack.cases.kpiMetrics.save', {
  defaultMessage: 'Save',
});

export const PERCENT = i18n.translate('xpack.cases.kpiMetrics.percent', {
  defaultMessage: 'Show as a percent',
});

export const CALCULATION_PERCENT = i18n.translate('xpack.cases.kpiMetrics.calculationPercent', {
  defaultMessage: 'Percent',
});

export const CALCULATION_BREAKDOWN = (field: string) =>
  i18n.translate('xpack.cases.kpiMetrics.calculationBreakdown', {
    values: { field },
    defaultMessage: 'Count by {field}',
  });

export const GROUP_BY = i18n.translate('xpack.cases.kpiMetrics.groupBy', {
  defaultMessage: 'Group by',
});

export const GROUP_BY_PLACEHOLDER = i18n.translate('xpack.cases.kpiMetrics.groupByPlaceholder', {
  defaultMessage: 'No grouping',
});

export const GROUP_BY_HELP = i18n.translate('xpack.cases.kpiMetrics.groupByHelp', {
  defaultMessage:
    'Shows the count for each value of the field. A case with more than one value counts once for each value.',
});

export const GROUP_BY_SIZE = i18n.translate('xpack.cases.kpiMetrics.groupBySize', {
  defaultMessage: 'Top values',
});

export const GROUP_BY_SIZE_HELP = i18n.translate('xpack.cases.kpiMetrics.groupBySizeHelp', {
  defaultMessage: 'Show 1 to 10 values. The tile adds the other values to Other.',
});

export const GROUP_BY_SIZE_ERROR = i18n.translate('xpack.cases.kpiMetrics.groupBySizeError', {
  defaultMessage: 'Enter a whole number from 1 to 10.',
});

export const GROUP_BY_FIELD_ERROR = i18n.translate('xpack.cases.kpiMetrics.groupByFieldError', {
  defaultMessage:
    'Select a field from the list, or enter an extended field that ends in _as_keyword.',
});

export const PERCENT_HELP = i18n.translate('xpack.cases.kpiMetrics.percentHelp', {
  defaultMessage:
    'The metric shows the documents that match the KQL query as a percent of all documents in the date range.',
});

export const DIRECTION = i18n.translate('xpack.cases.kpiMetrics.direction', {
  defaultMessage: 'Trend color',
});

export const DIRECTION_HELP = i18n.translate('xpack.cases.kpiMetrics.directionHelp', {
  defaultMessage: 'The tile compares the value with the previous period of the same length.',
});

export const DIRECTION_NONE = i18n.translate('xpack.cases.kpiMetrics.directionNone', {
  defaultMessage: 'No color',
});

export const DIRECTION_HIGHER_IS_BETTER = i18n.translate(
  'xpack.cases.kpiMetrics.directionHigherIsBetter',
  {
    defaultMessage: 'Higher is better',
  }
);

export const DIRECTION_LOWER_IS_BETTER = i18n.translate(
  'xpack.cases.kpiMetrics.directionLowerIsBetter',
  {
    defaultMessage: 'Lower is better',
  }
);

export const TEST_QUERY = i18n.translate('xpack.cases.kpiMetrics.testQuery', {
  defaultMessage: 'Test query',
});

export const PREVIEW_VALUE = (value: string) =>
  i18n.translate('xpack.cases.kpiMetrics.previewValue', {
    values: { value },
    defaultMessage: 'Value for the last 30 days: {value}',
  });

export const PREVIEW_BREAKDOWN = (values: string) =>
  i18n.translate('xpack.cases.kpiMetrics.previewBreakdown', {
    values: { values },
    defaultMessage: 'Values for the last 30 days: {values}',
  });

export const ACKNOWLEDGE_TRIGGER = i18n.translate('xpack.cases.kpiMetrics.acknowledgeTrigger', {
  defaultMessage: 'Acknowledged when',
});

export const ACKNOWLEDGE_TRIGGER_HELP = i18n.translate(
  'xpack.cases.kpiMetrics.acknowledgeTriggerHelp',
  {
    defaultMessage:
      'The event after the alert was added to the case that ends the time to acknowledge.',
  }
);

export const ACKNOWLEDGE_TRIGGER_ASSIGNED = i18n.translate(
  'xpack.cases.kpiMetrics.acknowledgeTriggerAssigned',
  {
    defaultMessage: 'The case is assigned',
  }
);

export const ACKNOWLEDGE_TRIGGER_IN_PROGRESS = i18n.translate(
  'xpack.cases.kpiMetrics.acknowledgeTriggerInProgress',
  {
    defaultMessage: 'The case status is In progress',
  }
);

export const ACKNOWLEDGE_TRIGGER_ASSIGNED_OR_IN_PROGRESS = i18n.translate(
  'xpack.cases.kpiMetrics.acknowledgeTriggerAssignedOrInProgress',
  {
    defaultMessage: 'The case is assigned or In progress (the first of the two)',
  }
);

export const DATE_BASIS = i18n.translate('xpack.cases.kpiMetrics.dateBasis', {
  defaultMessage: 'Date range applies to',
});

export const DATE_BASIS_HELP = i18n.translate('xpack.cases.kpiMetrics.dateBasisHelp', {
  defaultMessage:
    'The case close date counts only the cases that closed in the selected range. Open cases are not counted.',
});

export const DATE_BASIS_ATTACHED_AT = i18n.translate('xpack.cases.kpiMetrics.dateBasisAttachedAt', {
  defaultMessage: 'Alert added date',
});

export const DATE_BASIS_CASE_CLOSED_AT = i18n.translate(
  'xpack.cases.kpiMetrics.dateBasisCaseClosedAt',
  {
    defaultMessage: 'Case close date',
  }
);

export const AGGREGATE_BY_CASE = i18n.translate('xpack.cases.kpiMetrics.aggregateByCase', {
  defaultMessage: 'Count each case once',
});

export const AGGREGATE_BY_CASE_HELP = i18n.translate('xpack.cases.kpiMetrics.aggregateByCaseHelp', {
  defaultMessage:
    'The alerts of one case give one value for the case. The tile aggregates the case values.',
});

export const PREDEFINED_LABELS: Record<string, string> = {
  open_cases: i18n.translate('xpack.cases.kpiMetrics.predefinedOpenCases', {
    defaultMessage: 'Open cases',
  }),
  in_progress_cases: i18n.translate('xpack.cases.kpiMetrics.predefinedInProgressCases', {
    defaultMessage: 'In progress cases',
  }),
  closed_cases: i18n.translate('xpack.cases.kpiMetrics.predefinedClosedCases', {
    defaultMessage: 'Closed cases',
  }),
  average_time_to_close: i18n.translate('xpack.cases.kpiMetrics.predefinedAverageTimeToClose', {
    defaultMessage: 'Average time to close',
  }),
  alert_time_to_acknowledge_avg: i18n.translate(
    'xpack.cases.kpiMetrics.predefinedAlertTimeToAcknowledgeAvg',
    {
      defaultMessage: 'Average time to acknowledge an alert',
    }
  ),
  alert_time_to_acknowledge_median: i18n.translate(
    'xpack.cases.kpiMetrics.predefinedAlertTimeToAcknowledgeMedian',
    {
      defaultMessage: 'Median time to acknowledge an alert',
    }
  ),
};
