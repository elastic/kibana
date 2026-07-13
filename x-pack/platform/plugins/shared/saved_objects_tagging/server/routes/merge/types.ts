/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { SpacesServiceSetup } from '@kbn/spaces-plugin/server';

export interface MergeRouteStartDeps {
  taskManager: TaskManagerStartContract;
  security?: SecurityPluginStart;
}

export interface MergeRouteDeps {
  getStartServices: () => Promise<[CoreStart, MergeRouteStartDeps, unknown]>;
  spacesService?: SpacesServiceSetup;
}

export const DEFAULT_SPACE_ID = 'default';
