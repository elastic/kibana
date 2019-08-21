/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestType } from '../../../common/types/kibana';
import {
  DATA_FRAME_TRANSFORM_STATE,
  DataFrameTransformEndpointData,
} from '../../../public/data_frame/pages/transform_management/components/transform_list/common';

export function transformServiceProvider(callWithRequest: callWithRequestType) {
  async function deleteTransform(transformId: string) {
    return callWithRequest('ml.deleteDataFrameTransform', { transformId });
  }

  async function stopTransform(options: {
    transformId: string;
    force: boolean;
    waitForCompletion: boolean;
  }) {
    return callWithRequest('ml.stopDataFrameTransform', options);
  }

  async function startTransform(options: { transformId: string; force: boolean }) {
    return callWithRequest('ml.startDataFrameTransform', options);
  }

  async function deleteTransforms(transformsInfo: DataFrameTransformEndpointData[]) {
    const results = [];

    for (const transformInfo of transformsInfo) {
      try {
        if (transformInfo.state === DATA_FRAME_TRANSFORM_STATE.FAILED) {
          await stopTransform({
            transformId: transformInfo.id,
            force: true,
            waitForCompletion: true,
          });
        }

        await deleteTransform(transformInfo.id);
        results.push({ id: transformInfo.id, success: true });
      } catch (e) {
        results.push({ id: transformInfo.id, success: false, error: JSON.stringify(e) });
      }
    }
    return results;
  }

  async function startTransforms(transformsInfo: DataFrameTransformEndpointData[]) {
    const results = [];
    for (const transformInfo of transformsInfo) {
      try {
        await startTransform({
          transformId: transformInfo.id,
          force:
            transformInfo.state !== undefined
              ? transformInfo.state === DATA_FRAME_TRANSFORM_STATE.FAILED
              : false,
        });
        results.push({ id: transformInfo.id, success: true });
      } catch (e) {
        results.push({ id: transformInfo.id, success: false, error: JSON.stringify(e) });
      }
    }
    return results;
  }

  async function stopTransforms(transformsInfo: DataFrameTransformEndpointData[]) {
    const results = [];
    for (const transformInfo of transformsInfo) {
      try {
        await stopTransform({
          transformId: transformInfo.id,
          force:
            transformInfo.state !== undefined
              ? transformInfo.state === DATA_FRAME_TRANSFORM_STATE.FAILED
              : false,
          waitForCompletion: true,
        });
        results.push({ id: transformInfo.id, success: true });
      } catch (e) {
        results.push({ id: transformInfo.id, success: false, error: JSON.stringify(e) });
      }
    }
    return results;
  }

  return {
    deleteTransforms,
    startTransforms,
    stopTransforms,
  };
}
