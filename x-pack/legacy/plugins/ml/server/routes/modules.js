/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { DataRecognizer } from '../models/data_recognizer';

function recognize(callWithRequest, indexPatternTitle) {
  const dr = new DataRecognizer(callWithRequest);
  return dr.findMatches(indexPatternTitle);
}

function getModule(callWithRequest, moduleId) {
  const dr = new DataRecognizer(callWithRequest);
  if (moduleId === undefined) {
    return dr.listModules();
  } else {
    return dr.getModule(moduleId);
  }
}

function saveModuleItems(
  callWithRequest,
  moduleId,
  prefix,
  groups,
  indexPatternName,
  query,
  useDedicatedIndex,
  startDatafeed,
  start,
  end,
  jobOverrides,
  datafeedOverrides,
  request
) {
  const dr = new DataRecognizer(callWithRequest);
  return dr.setupModuleItems(
    moduleId,
    prefix,
    groups,
    indexPatternName,
    query,
    useDedicatedIndex,
    startDatafeed,
    start,
    end,
    jobOverrides,
    datafeedOverrides,
    request
  );
}

function dataRecognizerJobsExist(callWithRequest, moduleId) {
  const dr = new DataRecognizer(callWithRequest);
  return dr.dataRecognizerJobsExist(moduleId);
}

export function dataRecognizer({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'GET',
    path: '/api/ml/modules/recognize/{indexPatternTitle}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const indexPatternTitle = request.params.indexPatternTitle;
      return recognize(callWithRequest, indexPatternTitle).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/modules/get_module/{moduleId?}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      let moduleId = request.params.moduleId;
      if (moduleId === '') {
        // if the endpoint is called with a trailing /
        // the moduleId will be an empty string.
        moduleId = undefined;
      }
      return getModule(callWithRequest, moduleId).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'POST',
    path: '/api/ml/modules/setup/{moduleId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const moduleId = request.params.moduleId;

      const {
        prefix,
        groups,
        indexPatternName,
        query,
        useDedicatedIndex,
        startDatafeed,
        start,
        end,
        jobOverrides,
        datafeedOverrides,
      } = request.payload;

      return saveModuleItems(
        callWithRequest,
        moduleId,
        prefix,
        groups,
        indexPatternName,
        query,
        useDedicatedIndex,
        startDatafeed,
        start,
        end,
        jobOverrides,
        datafeedOverrides,
        request
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/modules/jobs_exist/{moduleId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const moduleId = request.params.moduleId;
      return dataRecognizerJobsExist(callWithRequest, moduleId).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
