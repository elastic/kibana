/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Annotation } from '../../../../common/types/annotations';
import { http, http$ } from '../http_service';
import { basePath } from './index';

export const annotations = {
  getAnnotations(obj: {
    jobIds: string[];
    earliestMs: number;
    latestMs: number;
    maxAnnotations: number;
  }) {
    return http$<{ annotations: Record<string, Annotation[]> }>(`${basePath()}/annotations`, {
      method: 'POST',
      body: obj,
    });
  },
  indexAnnotation(obj: any) {
    return http({
      url: `${basePath()}/annotations/index`,
      method: 'PUT',
      data: obj,
    });
  },
  deleteAnnotation(id: string) {
    return http({
      url: `${basePath()}/annotations/delete/${id}`,
      method: 'DELETE',
    });
  },
};
