/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  CUSTOM_APP_EMBEDDABLE_TYPE,
  CUSTOM_APP_APPLICATION_ID,
  CUSTOM_APP_STATE_VERSION,
  SAVED_APPS_API_PATH,
  SAVED_APPS_API_VERSION,
  CASES_FILTERS,
  CASES_SEVERITIES,
  CASES_SORT_FIELDS,
  CASES_STATUSES,
  DEFAULT_CASES_LIMIT,
  MAX_CASES_FILTER_LENGTH,
  MAX_CASES_LIMIT,
  MAX_FORM_FIELDS,
  BADGE_COLORS,
  CARD_ICONS,
  MAX_COLUMNS,
  PROGRESS_COLORS,
  THEME_ACCENTS,
  THEME_SHAPES,
  MAX_LIST_ITEMS,
  MAX_QUERY_OPTIONS,
  OPTIONS_SOURCE_SUFFIX,
  MAX_HEADING_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_QUERY_LENGTH,
  MAX_STATE_STRING_LENGTH,
  MAX_TEMPLATE_LENGTH,
  MAX_TEXT_LENGTH,
  MAX_WORKFLOW_ID_LENGTH,
  MAX_WORKFLOW_INPUT_NAME_LENGTH,
  MAX_WORKFLOW_INPUTS,
} from './document/constants';
export { querySchema } from './document/data_fields';
export {
  bindable,
  getBoundSignature,
  isNodeVisible,
  isStateRef,
  resolveBoundProps,
  resolveBoundValue,
  stateRef,
  stateRefSchema,
  THEME_BOUND_PROPS,
  type StateRef,
  type VisibleWhen,
} from './document/bindings';
export {
  actionSchema,
  appDocumentSchema,
  appDocumentShapeSchema,
  customAppStateSchema,
  isContainerNode,
  nodeSchema,
  stateDeclarationSchema,
  stateKeySchema,
  type Action,
  type AppDocument,
  type AppNode,
  type AppNodeOfType,
  type CasesSource,
  type ContainerNode,
  type DataSource,
  type AppNodeType,
  type AppTheme,
  type FormField,
  type StateDeclaration,
  type CustomAppState,
} from './document/document_schema';
export {
  findStateReferences,
  hasMalformedReference,
  interpolate,
  type StateValue,
} from './document/interpolation';
export {
  collectQueries,
  collectSources,
  getNodeSource,
  getOptionsSourceId,
  getSourceStateKeys,
  getInterpolatedText,
  getNodeActions,
  getBindingType,
  getNodeBindings,
  getNodeChildren,
  getNodeQuery,
  isEmptyDocument,
} from './document/node_tree';
export { getStateDefaults } from './document/state_defaults';
export { getDocumentIssues, type DocumentIssue } from './document/document_issues';

export { actionsSchema, listValueSchema, stateValueSchema } from './document/action_schemas';
export {
  badgeColorSchema,
  betterWhenSchema,
  calloutColorSchema,
  cardIconSchema,
  columnsCountSchema,
  progressColorSchema,
  progressMaxSchema,
  sectionOpenSchema,
  stackDirectionSchema,
} from './document/bindings';
export {
  MAX_BUTTON_GROUP_OPTIONS,
  MAX_INPUT_OPTIONS,
  MAX_KEY_VALUE_FIELDS,
  MAX_NODE_COUNT,
  MAX_NODE_DEPTH,
  MAX_TABLE_COLUMNS,
} from './document/constants';
export { casesSourceSchema, describedDataFields } from './document/data_fields';
export {
  describedInputProps,
  formFieldSchema,
  inputOptionSchema,
  linkTargetSchema,
} from './document/input_schemas';
