/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useAppDependencies } from '../app_dependencies';

import { PreviewRequestBody, TransformId } from '../common';

import { http } from '../services/http_service';

import { EsIndex, TransformEndpointRequest, TransformEndpointResult } from './use_api_types';

const apiFactory = (basePath: string, indicesBasePath: string) => ({
  getTransforms(transformId?: TransformId): Promise<any> {
    const transformIdString = transformId !== undefined ? `/${transformId}` : '';
    return http({
      url: `${basePath}/transforms${transformIdString}`,
      method: 'GET',
    });
  },
  getTransformsStats(transformId?: TransformId): Promise<any> {
    if (transformId !== undefined) {
      return http({
        url: `${basePath}/transforms/${transformId}/_stats`,
        method: 'GET',
      });
    }

    return http({
      url: `${basePath}/transforms/_stats`,
      method: 'GET',
    });
  },
  createTransform(transformId: TransformId, transformConfig: any): Promise<any> {
    return http({
      url: `${basePath}/transforms/${transformId}`,
      method: 'PUT',
      data: transformConfig,
    });
  },
  deleteTransforms(transformsInfo: TransformEndpointRequest[]) {
    return http({
      url: `${basePath}/delete_transforms`,
      method: 'POST',
      data: transformsInfo,
    }) as Promise<TransformEndpointResult>;
  },
  getTransformsPreview(obj: PreviewRequestBody): Promise<any> {
    return http({
      url: `${basePath}/transforms/_preview`,
      method: 'POST',
      data: obj,
    });
  },
  startTransforms(transformsInfo: TransformEndpointRequest[]) {
    return http({
      url: `${basePath}/start_transforms`,
      method: 'POST',
      data: {
        transformsInfo,
      },
    }) as Promise<TransformEndpointResult>;
  },
  stopTransforms(transformsInfo: TransformEndpointRequest[]) {
    return http({
      url: `${basePath}/stop_transforms`,
      method: 'POST',
      data: {
        transformsInfo,
      },
    }) as Promise<TransformEndpointResult>;
  },
  getTransformAuditMessages(transformId: TransformId): Promise<any> {
    return http({
      url: `${basePath}/transforms/${transformId}/messages`,
      method: 'GET',
    });
  },
  esSearch(payload: any) {
    return http({
      url: `${basePath}/es_search`,
      method: 'POST',
      data: payload,
    }) as Promise<any>;
  },
  getIndices() {
    return http({
      url: `${indicesBasePath}/index_management/indices`,
      method: 'GET',
    }) as Promise<EsIndex[]>;
  },
});

export const useApi = () => {
  const appDeps = useAppDependencies();

  const basePath = appDeps.core.http.basePath.prepend('/api/transform');
  const indicesBasePath = appDeps.core.http.basePath.prepend('/api');

  return apiFactory(basePath, indicesBasePath);
};
