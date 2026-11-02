/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PluginInitializerContext, TasksPlugin } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { namespaceToSpaceId, spaceIdToNamespace } from '../lib/utils/namespace';

/**
 * The part of the Spaces contract a task needs: reading the space a (fake) request runs in and
 * converting between space ids and saved object namespaces. Looking up space documents
 * (`getActiveSpace`) is not available to tasks.
 */
export interface SpacesTasksStart {
  spacesService: {
    getSpaceId: (request: { spaceId?: string }) => string;
    isInDefaultSpace: (request: { spaceId?: string }) => boolean;
    spaceIdToNamespace: typeof spaceIdToNamespace;
    namespaceToSpaceId: typeof namespaceToSpaceId;
  };
}

class SpacesTasksPlugin implements TasksPlugin<void, SpacesTasksStart> {
  setup() {}

  start(): SpacesTasksStart {
    return {
      spacesService: {
        getSpaceId: (request) => request.spaceId ?? DEFAULT_SPACE_ID,
        isInDefaultSpace: (request) => (request.spaceId ?? DEFAULT_SPACE_ID) === DEFAULT_SPACE_ID,
        spaceIdToNamespace,
        namespaceToSpaceId,
      },
    };
  }
}

export const plugin = async (_context: PluginInitializerContext) => new SpacesTasksPlugin();
