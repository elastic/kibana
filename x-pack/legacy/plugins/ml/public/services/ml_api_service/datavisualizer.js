/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { http } from '../../services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const fileDatavisualizer = {
  analyzeFile(obj, params = {}) {
    let paramString = '';
    if (Object.keys(params).length) {
      paramString = '?';
      for (const p in params) {
        if (params.hasOwnProperty(p)) {
          paramString += `&${p}=${params[p]}`;
        }
      }
    }
    return http({
      url: `${basePath}/file_data_visualizer/analyze_file${paramString}`,
      method: 'POST',
      data: obj,
    });
  },

  import(obj) {
    const paramString = obj.id !== undefined ? `?id=${obj.id}` : '';
    const { index, data, settings, mappings, ingestPipeline } = obj;

    return http({
      url: `${basePath}/file_data_visualizer/import${paramString}`,
      method: 'POST',
      data: {
        index,
        data,
        settings,
        mappings,
        ingestPipeline,
      },
    });
  },
};
