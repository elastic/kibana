/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';

import { http, httpCall } from '../../services/http_service';

const basePath = chrome.addBasePath('/api/ml');

export const annotations = {
  getAnnotations(obj: any) {
    return http({
      url: `${basePath}/annotations`,
      method: 'POST',
      data: obj,
    });
  },
  getAnnotationsRx(obj: any) {
    return httpCall(`${basePath}/annotations`, {
      method: 'POST',
      body: obj,
    });
  },
  indexAnnotation(obj: any) {
    return http({
      url: `${basePath}/annotations/index`,
      method: 'PUT',
      data: obj,
    });
  },
  deleteAnnotation(id: string) {
    return http({
      url: `${basePath}/annotations/delete/${id}`,
      method: 'DELETE',
    });
  },
};
