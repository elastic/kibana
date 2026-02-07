/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CustomRequestHandlerContext,
  IContextProvider,
  SavedObject,
  SavedObjectsResolveResponse,
} from '@kbn/core/server';
import type { WorkpadAttributes } from './routes/workpad/workpad_attributes';
import { CANVAS_TYPE } from '../common/lib/constants';
import { getId } from '../common/lib/get_id';
import type { CanvasWorkpad, ImportedCanvasWorkpad } from '../types';
import { transformWorkpadIn } from './embeddable/transform_workpad_in';
import { transformWorkpadOut } from './embeddable/transform_workpad_out';

export type CanvasRouteHandlerContext = CustomRequestHandlerContext<{
  canvas: {
    workpad: {
      create: (attributes: CanvasWorkpad) => Promise<SavedObject<WorkpadAttributes>>;
      import: (workpad: ImportedCanvasWorkpad) => Promise<SavedObject<WorkpadAttributes>>;
      get: (id: string) => Promise<SavedObject<WorkpadAttributes>>;
      resolve: (id: string) => Promise<SavedObjectsResolveResponse<WorkpadAttributes>>;
      update: (
        id: string,
        attributes: Partial<CanvasWorkpad>
      ) => Promise<SavedObject<WorkpadAttributes>>;
    };
  };
}>;

export const createWorkpadRouteContext: () => IContextProvider<
  CanvasRouteHandlerContext,
  'canvas'
> = () => {
  return async (context) => {
    const soClient = (await context.core).savedObjects.client;
    return {
      workpad: {
        create: async (workpad: CanvasWorkpad) => {
          const now = new Date().toISOString();
          const { id: maybeId, ...attributes } = workpad;

          const id = maybeId ? maybeId : getId('workpad');

          // embeddables transform in
          const { attributes: transformedAttributes, references } = transformWorkpadIn(attributes);

          return await soClient.create<WorkpadAttributes>(
            CANVAS_TYPE,
            {
              ...transformedAttributes,
              '@timestamp': now,
              '@created': now,
            },
            { id, references }
          );
        },
        import: async (workpad: ImportedCanvasWorkpad) => {
          const now = new Date().toISOString();
          const { id: maybeId, ...workpadWithoutId } = workpad;

          // Functionality of running migrations on import of workpads was implemented in v8.1.0.
          // As only attributes of the saved object workpad are exported, to run migrations it is necessary
          // to specify the minimal version of possible migrations to execute them. It is v8.0.0 in the current case.
          const DEFAULT_MIGRATION_VERSION = { [CANVAS_TYPE]: '8.0.0' };
          const DEFAULT_CORE_MIGRATION_VERSION = '8.0.0';

          const id = maybeId ? maybeId : getId('workpad');

          // embeddables transform in
          const { attributes, references } = transformWorkpadIn(
            workpadWithoutId as WorkpadAttributes
          );
          return await soClient.create<WorkpadAttributes>(
            CANVAS_TYPE,
            {
              ...attributes,
              '@timestamp': now,
              '@created': now,
            },
            {
              migrationVersion: DEFAULT_MIGRATION_VERSION,
              coreMigrationVersion: DEFAULT_CORE_MIGRATION_VERSION,
              id,
              references,
            }
          );
        },
        get: async (id: string) => {
          const workpad = await soClient.get<WorkpadAttributes>(CANVAS_TYPE, id);

          // embeddables transform out
          workpad.attributes = transformWorkpadOut(workpad.attributes, workpad.references);

          return workpad;
        },
        resolve: async (id: string) => {
          const resolved = await soClient.resolve<WorkpadAttributes>(CANVAS_TYPE, id);

          // embeddables transform out
          resolved.saved_object.attributes = transformWorkpadOut(
            resolved.saved_object.attributes,
            resolved.saved_object.references
          );

          return resolved;
        },
        update: async (id: string, { id: omittedId, ...workpad }: Partial<CanvasWorkpad>) => {
          const now = new Date().toISOString();

          const workpadObject = await soClient.get<WorkpadAttributes>(CANVAS_TYPE, id);

          // embeddables transform out
          const transformedAttributesOut = transformWorkpadOut(
            workpadObject.attributes,
            workpadObject.references
          );

          const updatedAttributes = {
            ...transformedAttributesOut,
            ...workpad,
            '@timestamp': now, // always update the modified time
            '@created': workpadObject.attributes['@created'], // ensure created is not modified
          } as WorkpadAttributes;

          // embeddables transform in
          const { attributes: transformedAttributes, references } =
            transformWorkpadIn(updatedAttributes);

          return await soClient.create(CANVAS_TYPE, transformedAttributes, {
            overwrite: true,
            id,
            references,
          });
        },
      },
    };
  };
};
