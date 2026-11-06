/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsType } from '@kbn/core-saved-objects-server';
import { TASK_MANAGER_INDEX } from '../constants';
import { backgroundTaskNodeMapping } from './mappings';
import { backgroundTaskNodeModelVersions } from './model_versions';

export const BACKGROUND_TASK_NODE_SO_NAME = 'background-task-node';

/** Leaf definition of the type, so task runtimes can register it without the saved objects barrel. */
export const backgroundTaskNodeType: SavedObjectsType = {
  name: BACKGROUND_TASK_NODE_SO_NAME,
  namespaceType: 'agnostic',
  hidden: true,
  mappings: backgroundTaskNodeMapping,
  indexPattern: TASK_MANAGER_INDEX,
  modelVersions: backgroundTaskNodeModelVersions,
};
