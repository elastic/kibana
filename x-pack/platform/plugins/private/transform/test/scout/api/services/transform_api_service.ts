/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KbnClient } from '@kbn/test';
import type { Client } from '@elastic/elasticsearch';
import type { PutTransformsRequestSchema } from '../../../../server/routes/api_schemas/transforms';

export interface TransformApiService {
  createTransform: (transformId: string, config: PutTransformsRequestSchema) => Promise<void>;
  deleteTransform: (transformId: string) => Promise<void>;
  cleanTransformIndices: () => Promise<void>;
  deleteDataViewByTitle: (title: string) => Promise<void>;
}

export function getTransformApiService(
  kbnClient: KbnClient,
  esClient: Client
): TransformApiService {
  return {
    async createTransform(transformId: string, config: PutTransformsRequestSchema) {
      try {
        const response = await esClient.transform.putTransform({
          transform_id: transformId,
          body: config as any,
        });

        // Wait for transform to exist
        let retries = 10;
        while (retries > 0) {
          try {
            await esClient.transform.getTransform({ transform_id: transformId });
            return; // Transform exists, we're done
          } catch {
            retries--;
            if (retries === 0) {
              throw new Error(
                `Transform ${transformId} was not created after waiting. Response: ${JSON.stringify(
                  response
                )}`
              );
            }
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      } catch (error) {
        throw new Error(`Failed to create transform ${transformId}: ${error}`);
      }
    },

    async deleteTransform(transformId: string) {
      try {
        // Stop the transform first
        await esClient.transform.stopTransform({
          transform_id: transformId,
          force: true,
          wait_for_completion: true,
        });

        // Then delete it
        await esClient.transform.deleteTransform({
          transform_id: transformId,
        });
      } catch (error) {
        // Ignore errors if transform doesn't exist
      }
    },

    async cleanTransformIndices() {
      // Get all transforms
      const transforms = await esClient.transform.getTransform();

      // Stop and delete each transform
      for (const transform of transforms.transforms) {
        try {
          await esClient.transform.stopTransform({
            transform_id: transform.id,
            force: true,
            wait_for_completion: true,
          });

          await esClient.transform.deleteTransform({
            transform_id: transform.id,
          });
        } catch {
          // Continue with next transform if this one fails
        }
      }

      // Delete transform notification indices - resolve wildcard first
      try {
        const { body: indices } = await esClient.cat.indices({
          index: '.transform-notifications-*',
          format: 'json',
        });

        if (indices && Array.isArray(indices) && indices.length > 0) {
          const indexNames = indices.map((idx: any) => idx.index);
          await esClient.indices.delete({
            index: indexNames,
            ignore_unavailable: true,
          });
        }
      } catch {
        // Ignore errors if no notification indices exist
      }
    },

    async deleteDataViewByTitle(title: string) {
      try {
        // Get all data views to find the one with matching title
        const response = await kbnClient.request({
          method: 'GET',
          path: '/api/data_views',
        });

        const dataViews = (response.data as any).data_view || [];
        const dataView = dataViews.find((dv: any) => dv.title === title);

        if (dataView && dataView.id) {
          await kbnClient.request({
            method: 'DELETE',
            path: `/api/data_views/data_view/${dataView.id}`,
          });
        }
      } catch {
        // Ignore errors if data view doesn't exist
      }
    },
  };
}
