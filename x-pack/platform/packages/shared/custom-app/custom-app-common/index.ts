/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_STATE_VERSION,
  MAX_HEADING_LENGTH,
  MAX_QUERY_LENGTH,
  MAX_STATE_STRING_LENGTH,
  MAX_TEXT_LENGTH,
} from './constants';
export {
  actionSchema,
  appDocumentSchema,
  appDocumentShapeSchema,
  customAppStateSchema,
  nodeSchema,
  stateDeclarationSchema,
  stateKeySchema,
  type Action,
  type AppDocument,
  type AppNode,
  type AppNodeOfType,
  type AppNodeType,
  type StateDeclaration,
  type CustomAppState,
} from './document_schema';
export {
  findStateReferences,
  hasMalformedReference,
  interpolate,
  type StateValue,
} from './interpolation';
export {
  collectQueries,
  getInterpolatedText,
  getNodeActions,
  getNodeBinding,
  getNodeChildren,
  getNodeQuery,
  isEmptyDocument,
} from './node_tree';
export { getStateDefaults } from './state_defaults';
export {
  addNode,
  createNodeId,
  createStateKey,
  duplicateNode,
  findNode,
  moveNode,
  pruneUnusedValues,
  removeNode,
  removeStateKey,
  setStateDeclaration,
  stateKeyForColumn,
  updateNode,
  type MutationResult,
  type NodeLocation,
} from './document_mutations';
export { getDocumentIssues, type DocumentIssue } from './document_issues';
