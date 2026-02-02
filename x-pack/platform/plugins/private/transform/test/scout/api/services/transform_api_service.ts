/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';

export interface TransformApiService {
  createTransform: (request: estypes.TransformPutTransformRequest) => Promise<void>;
  createTransformWithSecondaryAuth: (
    request: estypes.TransformPutTransformRequest,
    secondaryAuthValue: string
  ) => Promise<void>;
  getTransform: (
    request: estypes.TransformGetTransformRequest
  ) => Promise<estypes.TransformGetTransformTransformSummary>;
  getTransformStats: (
    request: estypes.TransformGetTransformStatsRequest
  ) => Promise<estypes.TransformGetTransformStatsTransformStats>;
  deleteTransform: (request: estypes.TransformDeleteTransformRequest) => Promise<void>;
  cleanTransformIndices: () => Promise<void>;
  deleteIndices: (request: estypes.IndicesDeleteRequest) => Promise<void>;
}

export function getTransformApiService(esClient: Client): TransformApiService {
  return {
    async createTransform(request: estypes.TransformPutTransformRequest) {
      try {
        await esClient.transform.putTransform(request);
      } catch (error) {
        throw new Error(`Failed to create transform ${request.transform_id}: ${error}`);
      }
    },
    async createTransformWithSecondaryAuth(
      request: estypes.TransformPutTransformRequest,
      secondaryAuthEncodedApiKey: string
    ) {
      try {
        await esClient.transform.putTransform(request, {
          headers: {
            'es-secondary-authorization': `ApiKey ${secondaryAuthEncodedApiKey}`,
          },
        });
      } catch (error) {
        throw new Error(`Failed to create transform ${request.transform_id}: ${error}`);
      }
    },

    async getTransform(request: estypes.TransformGetTransformRequest) {
      try {
        const response = await esClient.transform.getTransform(request);
        return response.transforms[0];
      } catch (error) {
        throw new Error(`Failed to get transform ${request.transform_id}: ${error}`);
      }
    },

    async getTransformStats(request: estypes.TransformGetTransformStatsRequest) {
      try {
        const response = await esClient.transform.getTransformStats({
          ...request,
        });
        return response.transforms[0];
      } catch (error) {
        throw new Error(`Failed to get transform stats for ${request.transform_id}: ${error}`);
      }
    },

    async deleteTransform(request: estypes.TransformDeleteTransformRequest) {
      try {
        // Stop the transform first
        await esClient.transform.stopTransform({
          ...request,
          force: true,
          wait_for_completion: true,
        });

        // Then delete it
        await esClient.transform.deleteTransform(request);
      } catch (error) {
        throw new Error(`Failed to delete transform ${request.transform_id}: ${error}`);
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

    async deleteIndices(request: estypes.IndicesDeleteRequest) {
      try {
        await esClient.indices.delete({
          ...request,
          ignore_unavailable: true,
        });
      } catch (error) {
        throw new Error(`Failed to delete indices ${request.index}: ${error}`);
      }
    },
  };
}
