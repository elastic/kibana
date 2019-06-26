/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import chrome from 'ui/chrome';

import { http } from '../../services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const dataFrame = {
  getDataFrameTransforms() {
    return http({
      url: `${basePath}/_data_frame/transforms`,
      method: 'GET'
    });
  },
  getDataFrameTransformsStats(jobId) {
    if (jobId !== undefined) {
      return http({
        url: `${basePath}/_data_frame/transforms/${jobId}/_stats`,
        method: 'GET'
      });
    }

    return http({
      url: `${basePath}/_data_frame/transforms/_stats`,
      method: 'GET'
    });
  },
  createDataFrameTransformsJob(jobId, jobConfig) {
    return http({
      url: `${basePath}/_data_frame/transforms/${jobId}`,
      method: 'PUT',
      data: jobConfig
    });
  },
  deleteDataFrameTransformsJob(jobId) {
    return http({
      url: `${basePath}/_data_frame/transforms/${jobId}`,
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
  startDataFrameTransformsJob(jobId) {
    return http({
      url: `${basePath}/_data_frame/transforms/${jobId}/_start`,
      method: 'POST',
    });
  },
  stopDataFrameTransformsJob(jobId) {
    return http({
      url: `${basePath}/_data_frame/transforms/${jobId}/_stop?force=true`,
      method: 'POST',
    });
  },
};
