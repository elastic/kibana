/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PreviewRequestBody, TransformId } from '../../common';

import { TransformEndpointRequest } from '../use_api_types';

const apiFactory = () => ({
  getTransforms(transformId?: TransformId): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  getTransformsStats(transformId?: TransformId): Promise<any> {
    if (transformId !== undefined) {
      return new Promise((resolve, reject) => {
        resolve([]);
      });
    }

    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  createTransform(transformId: TransformId, transformConfig: any): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  deleteTransforms(transformsInfo: TransformEndpointRequest[]) {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  getTransformsPreview(obj: PreviewRequestBody): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  startTransforms(transformsInfo: TransformEndpointRequest[]) {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  stopTransforms(transformsInfo: TransformEndpointRequest[]) {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  getTransformAuditMessages(transformId: TransformId): Promise<any> {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  esSearch(payload: any) {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
  getIndices() {
    return new Promise((resolve, reject) => {
      resolve([]);
    });
  },
});

export const useApi = () => {
  return apiFactory();
};
