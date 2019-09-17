/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestType } from '../../../common/types/kibana';
import { DATA_FRAME_TRANSFORM_STATE } from '../../../../transform/public/app/common';
import {
  DataFrameTransformEndpointRequest,
  DataFrameTransformEndpointResult,
} from '../../../../transform/public/app/pages/transform_management/components/transform_list/common';
import { DataFrameTransformId } from '../../../../transform/public/app/common/transform';
import { isRequestTimeout, fillResultsWithTimeouts } from './error_utils';

enum TRANSFORM_ACTIONS {
  STOP = 'stop',
  START = 'start',
  DELETE = 'delete',
}

interface StartStopOptions {
  transformId: DataFrameTransformId;
  force: boolean;
  waitForCompletion?: boolean;
}

export function transformServiceProvider(callWithRequest: callWithRequestType) {
  async function deleteTransform(transformId: DataFrameTransformId) {
    return callWithRequest('ml.deleteDataFrameTransform', { transformId });
  }

  async function stopTransform(options: StartStopOptions) {
    return callWithRequest('ml.stopDataFrameTransform', options);
  }

  async function startTransform(options: StartStopOptions) {
    return callWithRequest('ml.startDataFrameTransform', options);
  }

  async function deleteTransforms(transformsInfo: DataFrameTransformEndpointRequest[]) {
    const results: DataFrameTransformEndpointResult = {};

    for (const transformInfo of transformsInfo) {
      const transformId = transformInfo.id;
      try {
        if (transformInfo.state === DATA_FRAME_TRANSFORM_STATE.FAILED) {
          try {
            await stopTransform({
              transformId,
              force: true,
              waitForCompletion: true,
            });
          } catch (e) {
            if (isRequestTimeout(e)) {
              return fillResultsWithTimeouts({
                results,
                id: transformId,
                items: transformsInfo,
                action: TRANSFORM_ACTIONS.DELETE,
              });
            }
          }
        }

        await deleteTransform(transformId);
        results[transformId] = { success: true };
      } catch (e) {
        if (isRequestTimeout(e)) {
          return fillResultsWithTimeouts({
            results,
            id: transformInfo.id,
            items: transformsInfo,
            action: TRANSFORM_ACTIONS.DELETE,
          });
        }
        results[transformId] = { success: false, error: JSON.stringify(e) };
      }
    }
    return results;
  }

  async function startTransforms(transformsInfo: DataFrameTransformEndpointRequest[]) {
    const results: DataFrameTransformEndpointResult = {};

    for (const transformInfo of transformsInfo) {
      const transformId = transformInfo.id;
      try {
        await startTransform({
          transformId,
          force:
            transformInfo.state !== undefined
              ? transformInfo.state === DATA_FRAME_TRANSFORM_STATE.FAILED
              : false,
        });
        results[transformId] = { success: true };
      } catch (e) {
        if (isRequestTimeout(e)) {
          return fillResultsWithTimeouts({
            results,
            id: transformId,
            items: transformsInfo,
            action: TRANSFORM_ACTIONS.START,
          });
        }
        results[transformId] = { success: false, error: JSON.stringify(e) };
      }
    }
    return results;
  }

  async function stopTransforms(transformsInfo: DataFrameTransformEndpointRequest[]) {
    const results: DataFrameTransformEndpointResult = {};

    for (const transformInfo of transformsInfo) {
      const transformId = transformInfo.id;
      try {
        await stopTransform({
          transformId,
          force:
            transformInfo.state !== undefined
              ? transformInfo.state === DATA_FRAME_TRANSFORM_STATE.FAILED
              : false,
          waitForCompletion: true,
        });
        results[transformId] = { success: true };
      } catch (e) {
        if (isRequestTimeout(e)) {
          return fillResultsWithTimeouts({
            results,
            id: transformId,
            items: transformsInfo,
            action: TRANSFORM_ACTIONS.STOP,
          });
        }
        results[transformId] = { success: false, error: JSON.stringify(e) };
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
