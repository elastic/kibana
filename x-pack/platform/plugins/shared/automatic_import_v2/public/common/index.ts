/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { useKibana } from './hooks/use_kibana';
export { useFetchIndices } from './hooks/use_fetch_indices';
export { useGetIntegrationById } from './hooks/use_get_integration_by_id';
export { useCreateUpdateIntegration } from './hooks/use_create_update_integration';
export { useLoadConnectors } from './hooks/use_load_connectors';
export { useValidateIndex } from './hooks/use_validate_index';

export {
  INDEX_MISSING_EVENT_ORIGINAL,
  INDEX_VALIDATION_FAILED,
  SAVE_INTEGRATION_SUCCESS,
  SAVE_INTEGRATION_SUCCESS_DESCRIPTION,
  SAVE_INTEGRATION_ERROR,
} from './hooks/translations';

export {
  FLEET_PACKAGES_PATH,
  AUTOMATIC_IMPORT_INTEGRATIONS_PATH,
  getInstalledPackages,
  createIntegration,
  getIntegrationById,
} from './lib/api';

export type { CreateUpdateIntegrationRequest } from './lib/api';

export { generateId } from './lib/helper_functions';
