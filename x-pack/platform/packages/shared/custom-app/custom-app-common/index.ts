/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  MAX_STATE_STRING_LENGTH,
} from './constants';
export {
  actionSchema,
  appDocumentSchema,
  customAppStateSchema,
  esqlDataSourceSchema,
  nodeSchema,
  stateDeclarationSchema,
  stateKeySchema,
  type Action,
  type AppDocument,
  type AppNode,
  type AppNodeOfType,
  type AppNodeType,
  type EsqlDataSource,
  type StateDeclaration,
  type CustomAppState,
} from './document_schema';
export {
  findStateReferences,
  hasMalformedReference,
  interpolate,
  type StateValue,
} from './interpolation';
export { getInterpolatedText, getNodeActions, getNodeChildren, getNodeSourceId } from './node_tree';
export { getStateDefaults } from './state_defaults';
