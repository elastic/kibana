/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { apiTest } from '@kbn/scout';
export * as testData from './constants';
export { forDeployment } from './deployment';
export { deleteIndices } from './indices';
export {
  deleteLegacyTemplate,
  deleteTemplate,
  getSerializedTemplate,
  getTemplatePayload,
  getTemplateVersion,
  templateExists,
} from './templates';
export {
  createDataStream,
  deleteDataStream,
  describeStorage,
  expectedDataStream,
  getDataStream,
  getDataStreamMappings,
  updateIndexTemplateMappings,
} from './data_streams';
export {
  CLOUD_REPOSITORY_NAME,
  LOCAL_REPOSITORY_NAME,
  RESPONSE_KEYS_WITHOUT_DEFAULT,
  clearDefaultRepository,
  createLocalRepository,
  deleteAllRepositories,
  setDefaultRepository,
} from './snapshot_repositories';
