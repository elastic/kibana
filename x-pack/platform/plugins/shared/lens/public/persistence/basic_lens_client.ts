/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type {
  SerializableAttributes,
  BasicVisualizationClient,
} from '@kbn/visualizations-plugin/public';

import type { LensAttributes } from '../../server/content_management';
import { LensClient } from './lens_client';
import { getLensSOFromResponse } from './utils';

/**
 * This is a wrapper client used only to update basic attributes from the vis plugin
 */
export function getLensBasicClient<Attr extends SerializableAttributes = SerializableAttributes>(
  _: ContentManagementPublicStart,
  http: HttpStart
): BasicVisualizationClient<'lens', Attr> {
  const lensClient = new LensClient(http);

  return {
    get: async (id: string) => {
      const result = await lensClient.get(id);
      const lensSavedObject = getLensSOFromResponse(result);

      return {
        item: {
          ...lensSavedObject,
          // TODO: Fix this attributes type when config builder changes are applied
          attributes: lensSavedObject.attributes as unknown as Attr,
        },
        meta: {
          outcome: result.meta.outcome,
        },
      } satisfies Awaited<ReturnType<BasicVisualizationClient<'lens', Attr>['get']>>;
    },

    update: async ({ id, options = {}, data = {} }) => {
      const result = await lensClient.update(
        id,
        data as unknown as LensAttributes,
        options.references ?? []
      );

      const lensSavedObject = getLensSOFromResponse(result);

      return {
        item: {
          ...lensSavedObject,
          // TODO fix this attributes type when config builder changes are applied
          attributes: lensSavedObject.attributes as unknown as Attr,
        },
      } satisfies Awaited<ReturnType<BasicVisualizationClient<'lens', Attr>['update']>>;
    },

    delete: async (id: string) => {
      return lensClient.delete(id);
    },
  };
}
