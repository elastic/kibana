/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { CallCluster } from 'src/legacy/core_plugins/elasticsearch';
import { Router, RouterRouteHandler } from '../../../../../server/lib/create_router';
import { wrapEsError } from '../../../../../server/lib/create_router/error_wrappers';
import { Plugins } from '../../../shim';
import { TRANSFORM_STATE } from '../../../public/app/common';
import {
  TransformEndpointRequest,
  TransformEndpointResult,
} from '../../../public/app/sections/transform_management/components/transform_list/common';
import { TransformId } from '../../../public/app/common/transform';
import { isRequestTimeout, fillResultsWithTimeouts } from './error_utils';
import { transformAuditMessagesProvider } from './transform_audit_messages';

enum TRANSFORM_ACTIONS {
  STOP = 'stop',
  START = 'start',
  DELETE = 'delete',
}

interface StartStopOptions {
  transformId: TransformId;
  force: boolean;
  waitForCompletion?: boolean;
}

export function registerTransformsRoutes(router: Router, plugins: Plugins) {
  router.get('transforms', getTransformHandler);
  router.get('transforms/{transformId}', getTransformHandler);
  router.get('transforms/_stats', getTransformStatsHandler);
  router.get('transforms/{transformId}/_stats', getTransformStatsHandler);
  router.get('transforms/{transformId}/messages', getTransformMessagesHandler);
  router.put('transforms/{transformId}', putTransformHandler);
  router.delete('transforms/delete_transforms', deleteTransformsHandler);
  router.post('transforms/_preview', previewTransformHandler);
  router.post('transforms/start_transforms', startTransformsHandler);
  router.post('transforms/stop_transforms', stopTransformsHandler);
}

const getTransformHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { transformId } = req.params;
  const options = {
    ...(transformId !== undefined ? { transformId } : {}),
  };

  try {
    return await callWithRequest('transform.getTransforms', options);
  } catch (e) {
    return { error: wrapEsError(e) };
  }
};

const getTransformStatsHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { transformId } = req.params;
  const options = {
    ...(transformId !== undefined ? { transformId } : {}),
  };

  try {
    return await callWithRequest('transform.getTransformsStats', options);
  } catch (e) {
    return { error: wrapEsError(e) };
  }
};

const deleteTransformsHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { transformsInfo } = req.payload as {
    transformsInfo: TransformEndpointRequest[];
  };

  const response: {
    transformsDeleted: Array<{ transform: string }>;
    errors: any[];
  } = {
    transformsDeleted: [],
    errors: [],
  };

  await deleteTransforms(transformsInfo, callWithRequest)
    .then(() => (response.transformsDeleted = transformsInfo.map(d => ({ transform: d.id }))))
    .catch(e =>
      response.errors.push({
        error: wrapEsError(e),
      })
    );

  return response;
};

const putTransformHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { transformId } = req.params;

  const response: {
    transformsCreated: Array<{ transform: string }>;
    errors: any[];
  } = {
    transformsCreated: [],
    errors: [],
  };

  await callWithRequest('transform.createTransform', { body: req.payload, transformId })
    .then(() => response.transformsCreated.push({ transform: transformId }))
    .catch(e =>
      response.errors.push({
        id: transformId,
        error: wrapEsError(e),
      })
    );

  return response;
};

async function deleteTransforms(
  transformsInfo: TransformEndpointRequest[],
  callWithRequest: CallCluster
) {
  const results: TransformEndpointResult = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      if (transformInfo.state === TRANSFORM_STATE.FAILED) {
        try {
          await callWithRequest('ml.stopTransform', {
            transformId,
            force: true,
            waitForCompletion: true,
          } as StartStopOptions);
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

      await callWithRequest('transform.deleteTransform', { transformId });
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

const previewTransformHandler: RouterRouteHandler = async (req, callWithRequest) => {
  try {
    return await callWithRequest('transform.getTransformsPreview', { body: req.payload });
  } catch (e) {
    return wrapEsError(e);
  }
};

const startTransformsHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { transformsInfo } = req.payload as {
    transformsInfo: TransformEndpointRequest[];
  };

  try {
    return await startTransforms(transformsInfo, callWithRequest);
  } catch (e) {
    return wrapEsError(e);
  }
};

async function startTransforms(
  transformsInfo: TransformEndpointRequest[],
  callWithRequest: CallCluster
) {
  const results: TransformEndpointResult = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await callWithRequest('transform.startTransform', {
        transformId,
        force:
          transformInfo.state !== undefined
            ? transformInfo.state === TRANSFORM_STATE.FAILED
            : false,
      } as StartStopOptions);
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

const stopTransformsHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { transformsInfo } = req.payload as {
    transformsInfo: TransformEndpointRequest[];
  };

  try {
    return await stopTransforms(transformsInfo, callWithRequest);
  } catch (e) {
    return wrapEsError(e);
  }
};

async function stopTransforms(
  transformsInfo: TransformEndpointRequest[],
  callWithRequest: CallCluster
) {
  const results: TransformEndpointResult = {};

  for (const transformInfo of transformsInfo) {
    const transformId = transformInfo.id;
    try {
      await callWithRequest('ml.stopTransform', {
        transformId,
        force:
          transformInfo.state !== undefined
            ? transformInfo.state === TRANSFORM_STATE.FAILED
            : false,
        waitForCompletion: true,
      } as StartStopOptions);
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

const getTransformMessagesHandler: RouterRouteHandler = async (req, callWithRequest) => {
  const { getTransformAuditMessages } = transformAuditMessagesProvider(callWithRequest);
  const { transformId } = req.params;

  try {
    return await getTransformAuditMessages(transformId);
  } catch (e) {
    return wrapEsError(e);
  }
};
