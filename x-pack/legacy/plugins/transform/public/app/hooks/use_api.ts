/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAppDependencies } from '../app_dependencies';
import { PreviewRequestBody, TransformId } from '../common';

import { EsIndex, TransformEndpointRequest, TransformEndpointResult } from './use_api_types';

export const useApi = () => {
  const {
    core: { http },
  } = useAppDependencies();

  const basePath = http.basePath.prepend('/api/transform');
  const indicesBasePath = http.basePath.prepend('/api');

  return {
    getTransforms(transformId?: TransformId): Promise<any> {
      const transformIdString = transformId !== undefined ? `/${transformId}` : '';
      return http.get(`${basePath}/transforms${transformIdString}`);
    },
    getTransformsStats(transformId?: TransformId): Promise<any> {
      if (transformId !== undefined) {
        return http.get(`${basePath}/transforms/${transformId}/_stats`);
      }

      return http.get(`${basePath}/transforms/_stats`);
    },
    createTransform(transformId: TransformId, transformConfig: any): Promise<any> {
      return http.put(`${basePath}/transforms/${transformId}`, {
        body: JSON.stringify(transformConfig),
      });
    },
    deleteTransforms(transformsInfo: TransformEndpointRequest[]): Promise<TransformEndpointResult> {
      return http.post(`${basePath}/delete_transforms`, {
        body: JSON.stringify(transformsInfo),
      });
    },
    getTransformsPreview(obj: PreviewRequestBody): Promise<any> {
      return http.post(`${basePath}/transforms/_preview`, { body: JSON.stringify(obj) });
    },
    startTransforms(transformsInfo: TransformEndpointRequest[]): Promise<TransformEndpointResult> {
      return http.post(`${basePath}/start_transforms`, {
        body: JSON.stringify(transformsInfo),
      });
    },
    stopTransforms(transformsInfo: TransformEndpointRequest[]): Promise<TransformEndpointResult> {
      return http.post(`${basePath}/stop_transforms`, {
        body: JSON.stringify(transformsInfo),
      });
    },
    getTransformAuditMessages(transformId: TransformId): Promise<any> {
      return http.get(`${basePath}/transforms/${transformId}/messages`);
    },
    esSearch(payload: any): Promise<any> {
      return http.post(`${basePath}/es_search`, { body: JSON.stringify(payload) });
    },
    getIndices(): Promise<EsIndex[]> {
      return http.get(`${indicesBasePath}/index_management/indices`);
    },
  };
};
