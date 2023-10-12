/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { createApmErrorCountRule } from './src/create_apm_error_count_threshold_rule';
export { createApmFailedTransactionRateRule } from './src/create_apm_failed_transaction_rate_rule';
export { createCustomThresholdRule } from './src/create_custom_threshold_rule';
export { createDataView } from './src/create_data_view';
export { createIndexConnector } from './src/create_index_connector';
export { createRule } from './src/create_rule';

export { scenario1 } from './src/scenarios/custom_threshold_log_count';
export { scenario2 } from './src/scenarios/custom_threshold_log_count_groupby';
export { scenario3 } from './src/scenarios/custom_threshold_log_count_nodata';
export { scenario4 } from './src/scenarios/custom_threshold_metric_avg';
export { scenario5 } from './src/scenarios/custom_threshold_metric_avg_groupby';
export { scenario6 } from './src/scenarios/custom_threshold_metric_avg_nodata';
