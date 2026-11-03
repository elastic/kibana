/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreTasksSetup,
  CoreTasksStart,
  PluginInitializerContext,
  TasksPlugin,
} from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { spacesBridge } from './bridge';
import type { Space } from '../../common';
import { namespaceToSpaceId, spaceIdToNamespace } from '../lib/utils/namespace';
import { spaceSavedObjectType } from '../saved_objects/space_type';
import type { SpaceSavedObjectAttributes } from '../types';

/**
 * The part of the Spaces contract a task needs: reading the space a (fake) request runs in,
 * looking up its document and converting between space ids and saved object namespaces.
 */
export interface SpacesTasksStart {
  spacesService: {
    getSpaceId: (request: { spaceId?: string }) => string;
    isInDefaultSpace: (request: { spaceId?: string }) => boolean;
    /**
     * The space a request runs in. In Kibana this is the plugin's own lookup. A task pod reads the
     * space document with the internal user and has no features: `disabledFeatures` is what the
     * document persists (no deprecated feature mapping, nothing added by the solution) and
     * `projectRouting` is not set.
     */
    getActiveSpace: (request: { spaceId?: string }) => Promise<Space>;
    spaceIdToNamespace: typeof spaceIdToNamespace;
    namespaceToSpaceId: typeof namespaceToSpaceId;
  };
}

class SpacesTasksPlugin implements TasksPlugin<void, SpacesTasksStart> {
  private readonly isServerless: boolean;

  constructor(context: PluginInitializerContext) {
    this.isServerless = context.env.packageInfo.buildFlavor === 'serverless';
  }

  setup(core: CoreTasksSetup) {
    // In Kibana the plugin's `server` entry has registered the type already.
    if (spacesBridge.getSetup()) return;
    core.savedObjects.registerType(spaceSavedObjectType);
  }

  start(core: CoreTasksStart): SpacesTasksStart {
    const real = spacesBridge.getStart();
    return {
      spacesService: {
        getSpaceId: (request) => request.spaceId ?? DEFAULT_SPACE_ID,
        isInDefaultSpace: (request) => (request.spaceId ?? DEFAULT_SPACE_ID) === DEFAULT_SPACE_ID,
        getActiveSpace: real
          ? real.getActiveSpace
          : async (request) => {
              const repository = core.savedObjects.createInternalRepository(['space']);
              const id = request.spaceId ?? DEFAULT_SPACE_ID;
              const { attributes } = await repository.get<SpaceSavedObjectAttributes>('space', id);
              return {
                id,
                name: attributes.name ?? '',
                description: attributes.description,
                color: attributes.color,
                initials: attributes.initials,
                imageUrl: attributes.imageUrl,
                disabledFeatures: attributes.disabledFeatures ?? [],
                _reserved: attributes._reserved,
                // Solution isn't supported in the serverless offering.
                ...(!this.isServerless && attributes.solution
                  ? { solution: attributes.solution }
                  : {}),
              } as Space;
            },
        spaceIdToNamespace,
        namespaceToSpaceId,
      },
    };
  }
}

export const plugin = async (context: PluginInitializerContext) => new SpacesTasksPlugin(context);
