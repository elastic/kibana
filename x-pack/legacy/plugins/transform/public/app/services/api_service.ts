/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { PreviewRequestBody, TransformId } from '../common';

import {
  TransformEndpointRequest,
  TransformEndpointResult,
} from '../pages/transform_management/components/transform_list/common';

import { http } from './http_service';

const basePath = chrome.addBasePath('/api/ml');

export const api = {
  getTransforms(transformId?: TransformId): Promise<any> {
    const transformIdString = transformId !== undefined ? `/${transformId}` : '';
    return http({
      url: `${basePath}/_data_frame/transforms${transformIdString}`,
      method: 'GET',
    });
  },
  getTransformsStats(transformId?: TransformId): Promise<any> {
    if (transformId !== undefined) {
      return http({
        url: `${basePath}/_data_frame/transforms/${transformId}/_stats`,
        method: 'GET',
      });
    }

    return http({
      url: `${basePath}/_data_frame/transforms/_stats`,
      method: 'GET',
    });
  },
  createTransform(transformId: TransformId, transformConfig: any): Promise<any> {
    return http({
      url: `${basePath}/_data_frame/transforms/${transformId}`,
      method: 'PUT',
      data: transformConfig,
    });
  },

  deleteTransforms(transformsInfo: TransformEndpointRequest[]) {
    return http({
      url: `${basePath}/_data_frame/transforms/delete_transforms`,
      method: 'POST',
      data: {
        transformsInfo,
      },
    }) as Promise<TransformEndpointResult>;
  },
  getTransformsPreview(obj: PreviewRequestBody): Promise<any> {
    return http({
      url: `${basePath}/_data_frame/transforms/_preview`,
      method: 'POST',
      data: obj,
    });
  },
  startTransforms(transformsInfo: TransformEndpointRequest[]) {
    return http({
      url: `${basePath}/_data_frame/transforms/start_transforms`,
      method: 'POST',
      data: {
        transformsInfo,
      },
    }) as Promise<TransformEndpointResult>;
  },
  stopTransforms(transformsInfo: TransformEndpointRequest[]) {
    return http({
      url: `${basePath}/_data_frame/transforms/stop_transforms`,
      method: 'POST',
      data: {
        transformsInfo,
      },
    }) as Promise<TransformEndpointResult>;
  },
  getTransformAuditMessages(transformId: TransformId): Promise<any> {
    return http({
      url: `${basePath}/_data_frame/transforms/${transformId}/messages`,
      method: 'GET',
    });
  },
};
