/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { PutTransformsRequestSchema } from '../../../../server/routes/api_schemas/transforms';

export interface TransformApiService {
  createTransform: (transformId: string, config: PutTransformsRequestSchema) => Promise<void>;
  createTransformWithSecondaryAuth: (
    transformId: string,
    config: PutTransformsRequestSchema,
    secondaryAuthValue: string,
    deferValidation?: boolean
  ) => Promise<void>;
  getTransform: (transformId: string) => Promise<any>;
  getTransformStats: (transformId: string) => Promise<any>;
  deleteTransform: (transformId: string) => Promise<void>;
  waitForTransformToExist: (transformId: string) => Promise<void>;
  cleanTransformIndices: () => Promise<void>;
  deleteIndices: (index: string) => Promise<void>;
}

export function getTransformApiService(esClient: Client): TransformApiService {
  return {
    async waitForTransformToExist(transformId: string) {
      let retries = 10;
      while (retries > 0) {
        try {
          await esClient.transform.getTransform({ transform_id: transformId });
          return; // Transform exists, we're done
        } catch {
          retries--;
          if (retries === 0) {
            throw new Error(`Transform ${transformId} was not created after waiting.`);
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    },

    async createTransform(transformId: string, config: PutTransformsRequestSchema) {
      try {
        await esClient.transform.putTransform({
          transform_id: transformId,
          ...config,
        } as any);
        await this.waitForTransformToExist(transformId);
      } catch (error) {
        throw new Error(`Failed to create transform ${transformId}: ${error}`);
      }
    },

    async createTransformWithSecondaryAuth(
      transformId: string,
      config: PutTransformsRequestSchema,
      secondaryAuthEncodedApiKey: string,
      deferValidation = false
    ) {
      try {
        await esClient.transform.putTransform(
          {
            transform_id: transformId,
            defer_validation: deferValidation,
            ...config,
          } as any,
          {
            headers: {
              'es-secondary-authorization': `ApiKey ${secondaryAuthEncodedApiKey}`,
            },
          }
        );

        await this.waitForTransformToExist(transformId);
      } catch (error) {
        throw new Error(`Failed to create transform ${transformId}: ${error}`);
      }
    },

    async getTransform(transformId: string) {
      try {
        const response = await esClient.transform.getTransform({ transform_id: transformId });
        return response.transforms[0];
      } catch (error) {
        throw new Error(`Failed to get transform ${transformId}: ${error}`);
      }
    },

    async getTransformStats(transformId: string) {
      try {
        const response = await esClient.transform.getTransformStats({
          transform_id: transformId,
        });
        return response.transforms[0];
      } catch (error) {
        throw new Error(`Failed to get transform stats for ${transformId}: ${error}`);
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
        throw new Error(`Failed to delete transform ${transformId}: ${error}`);
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
        } catch (error) {
          throw new Error(`Failed to delete transform ${transform.id}: ${error}`);
        }
      }

      // Delete transform notification indices - resolve wildcard first
      try {
        const indices = await esClient.cat.indices({
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
      } catch (error) {
        throw new Error(`Failed to delete transform notification indices: ${error}`);
      }
    },

    async deleteIndices(index: string) {
      try {
        await esClient.indices.delete({
          index,
          ignore_unavailable: true,
        });
      } catch (error) {
        throw new Error(`Failed to delete indices ${index}: ${error}`);
      }
    },
  };
}
