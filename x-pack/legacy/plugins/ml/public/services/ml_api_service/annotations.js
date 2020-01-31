/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { http } from '../../services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const annotations = {
  getAnnotations(obj) {
    return http({
      url: `${basePath}/annotations`,
      method: 'POST',
      data: obj,
    });
  },
  indexAnnotation(obj) {
    return http({
      url: `${basePath}/annotations/index`,
      method: 'PUT',
      data: obj,
    });
  },
  deleteAnnotation(id) {
    return http({
      url: `${basePath}/annotations/delete/${id}`,
      method: 'DELETE',
    });
  },
};
