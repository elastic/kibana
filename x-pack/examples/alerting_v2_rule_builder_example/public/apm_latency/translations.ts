/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const prefix = 'xpack.alertingV2RuleBuilderExample.apmLatency';

export const CREATE_OPTION_TITLE = i18n.translate(`${prefix}.createOptionTitle`, {
  defaultMessage: 'APM latency rule',
});

export const CREATE_OPTION_DESCRIPTION = i18n.translate(`${prefix}.createOptionDescription`, {
  defaultMessage: 'Alert when a service responds more slowly than expected.',
});

export const CREATE_FLYOUT_TITLE = i18n.translate(`${prefix}.createFlyoutTitle`, {
  defaultMessage: 'Create APM latency rule',
});

export const STEP_TITLE = i18n.translate(`${prefix}.stepTitle`, {
  defaultMessage: 'Latency condition',
});

export const INDEX_LABEL = i18n.translate(`${prefix}.indexLabel`, {
  defaultMessage: 'Index pattern',
});

export const INDEX_HELP = i18n.translate(`${prefix}.indexHelp`, {
  defaultMessage: 'The index pattern to query APM transaction documents from.',
});

export const SERVICE_NAME_LABEL = i18n.translate(`${prefix}.serviceNameLabel`, {
  defaultMessage: 'Service name',
});

export const SERVICE_NAME_PLACEHOLDER = i18n.translate(`${prefix}.serviceNamePlaceholder`, {
  defaultMessage: 'e.g. checkout',
});

export const ENVIRONMENT_LABEL = i18n.translate(`${prefix}.environmentLabel`, {
  defaultMessage: 'Environment',
});

export const ENVIRONMENT_HELP = i18n.translate(`${prefix}.environmentHelp`, {
  defaultMessage: 'Leave empty to measure every environment together.',
});

export const TRANSACTION_TYPE_LABEL = i18n.translate(`${prefix}.transactionTypeLabel`, {
  defaultMessage: 'Transaction type',
});

export const ALL_TRANSACTION_TYPES_OPTION = i18n.translate(`${prefix}.allTransactionTypesOption`, {
  defaultMessage: 'All',
});

export const PERCENTILE_LABEL = i18n.translate(`${prefix}.percentileLabel`, {
  defaultMessage: 'Latency percentile',
});

export const THRESHOLD_LABEL = i18n.translate(`${prefix}.thresholdLabel`, {
  defaultMessage: 'Threshold (ms)',
});

export const TIME_FIELD_LABEL = i18n.translate(`${prefix}.timeFieldLabel`, {
  defaultMessage: 'Time field',
});

export const TIME_FIELD_HELP = i18n.translate(`${prefix}.timeFieldHelp`, {
  defaultMessage: 'The timestamp field used for the lookback window.',
});

export const PREVIEW_TOOLTIP = i18n.translate(`${prefix}.previewTooltip`, {
  defaultMessage: 'Preview results',
});

export const GROUP_BY_TRANSACTION_NAME_LABEL = i18n.translate(
  `${prefix}.groupByTransactionNameLabel`,
  { defaultMessage: 'Alert per transaction name' }
);

export const GROUP_BY_TRANSACTION_NAME_HELP = i18n.translate(
  `${prefix}.groupByTransactionNameHelp`,
  { defaultMessage: 'Evaluates each endpoint separately instead of the service as a whole.' }
);

export const getPercentileOptionLabel = (percentile: number) =>
  i18n.translate(`${prefix}.percentileOptionLabel`, {
    defaultMessage: '{percentile}th percentile',
    values: { percentile },
  });
