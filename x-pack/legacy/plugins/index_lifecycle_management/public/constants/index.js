/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const SET_PHASE_DATA = 'SET_PHASE_DATA';
export const SET_SELECTED_NODE_ATTRS = 'SET_SELECTED_NODE_ATTRS';
export const PHASE_HOT = 'hot';
export const PHASE_WARM = 'warm';
export const PHASE_COLD = 'cold';
export const PHASE_DELETE = 'delete';

export const PHASE_ENABLED = 'phaseEnabled';

export const PHASE_ROLLOVER_ENABLED = 'rolloverEnabled';
export const WARM_PHASE_ON_ROLLOVER = 'warmPhaseOnRollover';
export const PHASE_ROLLOVER_ALIAS = 'selectedAlias';
export const PHASE_ROLLOVER_MAX_AGE = 'selectedMaxAge';
export const PHASE_ROLLOVER_MAX_AGE_UNITS = 'selectedMaxAgeUnits';
export const PHASE_ROLLOVER_MAX_SIZE_STORED = 'selectedMaxSizeStored';
export const PHASE_ROLLOVER_MAX_DOCUMENTS = 'selectedMaxDocuments';
export const PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS = 'selectedMaxSizeStoredUnits';
export const PHASE_ROLLOVER_MINIMUM_AGE = 'selectedMinimumAge';
export const PHASE_ROLLOVER_MINIMUM_AGE_UNITS = 'selectedMinimumAgeUnits';

export const PHASE_FORCE_MERGE_SEGMENTS = 'selectedForceMergeSegments';
export const PHASE_FORCE_MERGE_ENABLED = 'forceMergeEnabled';
export const PHASE_FREEZE_ENABLED = 'freezeEnabled';

export const PHASE_SHRINK_ENABLED = 'shrinkEnabled';

export const PHASE_NODE_ATTRS = 'selectedNodeAttrs';
export const PHASE_PRIMARY_SHARD_COUNT = 'selectedPrimaryShardCount';
export const PHASE_REPLICA_COUNT = 'selectedReplicaCount';
export const PHASE_INDEX_PRIORITY = 'phaseIndexPriority';

export const PHASE_ATTRIBUTES_THAT_ARE_NUMBERS_VALIDATE = [
  PHASE_ROLLOVER_MINIMUM_AGE,
  PHASE_FORCE_MERGE_SEGMENTS,
  PHASE_PRIMARY_SHARD_COUNT,
  PHASE_REPLICA_COUNT,
  PHASE_INDEX_PRIORITY,
];
export const PHASE_ATTRIBUTES_THAT_ARE_NUMBERS = [
  ...PHASE_ATTRIBUTES_THAT_ARE_NUMBERS_VALIDATE,
  PHASE_ROLLOVER_MAX_AGE,
  PHASE_ROLLOVER_MAX_SIZE_STORED,
  PHASE_ROLLOVER_MAX_DOCUMENTS,
];

export const STRUCTURE_INDEX_TEMPLATE = 'indexTemplate';
export const STRUCTURE_TEMPLATE_SELECTION = 'templateSelection';
export const STRUCTURE_TEMPLATE_NAME = 'templateName';
export const STRUCTURE_CONFIGURATION = 'configuration';
export const STRUCTURE_NODE_ATTRS = 'node_attrs';
export const STRUCTURE_PRIMARY_NODES = 'primary_nodes';
export const STRUCTURE_REPLICAS = 'replicas';

export const STRUCTURE_POLICY_CONFIGURATION = 'policyConfiguration';

export const STRUCTURE_REVIEW = 'review';
export const STRUCTURE_POLICY_NAME = 'policyName';
export const STRUCTURE_INDEX_NAME = 'indexName';
export const STRUCTURE_ALIAS_NAME = 'aliasName';

export const ERROR_STRUCTURE = {
  [PHASE_HOT]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MAX_AGE]: [],
    [PHASE_ROLLOVER_MAX_AGE_UNITS]: [],
    [PHASE_ROLLOVER_MAX_SIZE_STORED]: [],
    [PHASE_ROLLOVER_MAX_DOCUMENTS]: [],
    [PHASE_ROLLOVER_MAX_SIZE_STORED_UNITS]: [],
    [PHASE_INDEX_PRIORITY]: [],
  },
  [PHASE_WARM]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: [],
    [PHASE_NODE_ATTRS]: [],
    [PHASE_PRIMARY_SHARD_COUNT]: [],
    [PHASE_REPLICA_COUNT]: [],
    [PHASE_FORCE_MERGE_SEGMENTS]: [],
    [PHASE_INDEX_PRIORITY]: [],
  },
  [PHASE_COLD]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: [],
    [PHASE_NODE_ATTRS]: [],
    [PHASE_REPLICA_COUNT]: [],
    [PHASE_INDEX_PRIORITY]: [],
  },
  [PHASE_DELETE]: {
    [PHASE_ROLLOVER_ALIAS]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE]: [],
    [PHASE_ROLLOVER_MINIMUM_AGE_UNITS]: [],
  },
  [STRUCTURE_POLICY_NAME]: [],
};
