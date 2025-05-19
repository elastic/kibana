/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ML_INTERNAL_BASE_PATH } from '@kbn/ml-common-constants/app';
import type { Annotation, GetAnnotationsResponse } from '@kbn/ml-common-types/annotations';
import type { HttpService } from '../http_service';

export const annotationsApiProvider = (httpService: HttpService) => ({
  getAnnotations$(obj: {
    jobIds: string[];
    earliestMs: number;
    latestMs: number;
    maxAnnotations: number;
    detectorIndex?: number;
    entities?: any[];
  }) {
    const body = JSON.stringify(obj);
    return httpService.http$<GetAnnotationsResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/annotations`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  getAnnotations(obj: {
    jobIds: string[];
    earliestMs: number | null;
    latestMs: number | null;
    maxAnnotations: number;
    detectorIndex?: number;
    entities?: any[];
  }) {
    const body = JSON.stringify(obj);
    return httpService.http<GetAnnotationsResponse>({
      path: `${ML_INTERNAL_BASE_PATH}/annotations`,
      method: 'POST',
      body,
      version: '1',
    });
  },

  indexAnnotation(obj: Annotation) {
    const body = JSON.stringify(obj);
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/annotations/index`,
      method: 'PUT',
      body,
      version: '1',
    });
  },
  deleteAnnotation(id: string) {
    return httpService.http<any>({
      path: `${ML_INTERNAL_BASE_PATH}/annotations/delete/${id}`,
      method: 'DELETE',
      version: '1',
    });
  },
});

export type AnnotationsApiService = ReturnType<typeof annotationsApiProvider>;
