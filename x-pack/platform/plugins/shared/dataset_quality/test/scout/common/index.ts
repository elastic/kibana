/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  COMMON_HEADERS,
  DATASET_QUALITY_API_BASE,
  DEFAULT_NAMESPACE,
  LOGS_TYPE,
  PACKAGES,
  PRODUCTION_NAMESPACE,
  buildDataStreamName,
} from './constants';

export {
  ANOTHER_1024_CHARS,
  CONSISTENT_TAGS,
  MORE_THAN_1024_CHARS,
  createDegradedFieldsRecord,
  createFailedLogRecord,
  createLogRecord,
  createMalformedFieldRecord,
  datasetNames,
  getInitialTestLogs,
  getLogsForDataset,
  logLevelNormalizationProcessors,
} from './logs_data';

export { indexLogs } from './synthtrace';

export { ensurePackageInstalled } from './fleet_helpers';
export type { FleetIntegrationApi } from './fleet_helpers';

export { logsSynthMalformedMappings, logsSynthMappings } from './custom_synth_mappings';
export { logsNginxMappings } from './custom_integration_mappings';
export { logsApmAppMappings } from './custom_apm_mappings';

export {
  addIntegrationToLogIndexTemplate,
  cleanLogIndexTemplate,
  cleanUpAll,
  closeDataStream,
  countFailureStoreIndices,
  createComponentTemplate,
  createIndexTemplate,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  deletePipelineIfExists,
  disableFailureStoreIfExists,
  getBackingIndexNames,
  getDataStreamSettingsOfEarliestIndex,
  getWriteBackingIndexName,
  refreshFailureStore,
  rolloverDataStream,
  setDataStreamSettings,
} from './es_helpers';

export {
  canManageAlertsRole,
  canManageRulesRole,
  cannotReadFailureStoreRole,
  fullAccessRole,
  fullAccessRoleWithIndices,
  monitorRole,
  noAccessRole,
  noDatasetQualityAccessRole,
  readOnlyRole,
} from './roles';
