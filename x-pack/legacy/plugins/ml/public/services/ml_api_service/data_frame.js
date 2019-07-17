/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import chrome from 'ui/chrome';

import { http } from '../../services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const dataFrame = {
  getDataFrameTransforms(transformId) {
    const transformIdString = transformId !== undefined ? `/${transformId}` : '';
    return http({
      url: `${basePath}/_data_frame/transforms${transformIdString}`,
      method: 'GET'
    });
  },
  getDataFrameTransformsStats(transformId) {
    if (transformId !== undefined) {
      return http({
        url: `${basePath}/_data_frame/transforms/${transformId}/_stats`,
        method: 'GET'
      });
    }

    return http({
      url: `${basePath}/_data_frame/transforms/_stats`,
      method: 'GET'
    });
  },
  createDataFrameTransform(transformId, transformConfig) {
    return http({
      url: `${basePath}/_data_frame/transforms/${transformId}`,
      method: 'PUT',
      data: transformConfig
    });
  },
  deleteDataFrameTransform(transformId) {
    return http({
      url: `${basePath}/_data_frame/transforms/${transformId}`,
      method: 'DELETE',
    });
  },
  getDataFrameTransformsPreview(obj) {
    return http({
      url: `${basePath}/_data_frame/transforms/_preview`,
      method: 'POST',
      data: obj
    });
  },
  startDataFrameTransform(transformId, force = false) {
    return http({
      url: `${basePath}/_data_frame/transforms/${transformId}/_start?force=${force}`,
      method: 'POST',
    });
  },
  stopDataFrameTransform(transformId, force = false, waitForCompletion = false) {
    return http({
      url: `${basePath}/_data_frame/transforms/${transformId}/_stop?force=${force}&wait_for_completion=${waitForCompletion}`,
      method: 'POST',
    });
  },
  getTransformAuditMessages(transformId) {
    return http({
      url: `${basePath}/_data_frame/transforms/${transformId}/messages`,
      method: 'GET',
    });
  },
};
