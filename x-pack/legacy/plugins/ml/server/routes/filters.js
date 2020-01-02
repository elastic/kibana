/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { callWithRequestFactory } from '../client/call_with_request_factory';
import { wrapError } from '../client/errors';
import { FilterManager } from '../models/filter';

// TODO - add function for returning a list of just the filter IDs.
// TODO - add function for returning a list of filter IDs plus item count.
function getAllFilters(callWithRequest) {
  const mgr = new FilterManager(callWithRequest);
  return mgr.getAllFilters();
}

function getAllFilterStats(callWithRequest) {
  const mgr = new FilterManager(callWithRequest);
  return mgr.getAllFilterStats();
}

function getFilter(callWithRequest, filterId) {
  const mgr = new FilterManager(callWithRequest);
  return mgr.getFilter(filterId);
}

function newFilter(callWithRequest, filter) {
  const mgr = new FilterManager(callWithRequest);
  return mgr.newFilter(filter);
}

function updateFilter(callWithRequest, filterId, description, addItems, removeItems) {
  const mgr = new FilterManager(callWithRequest);
  return mgr.updateFilter(filterId, description, addItems, removeItems);
}

function deleteFilter(callWithRequest, filterId) {
  const mgr = new FilterManager(callWithRequest);
  return mgr.deleteFilter(filterId);
}

export function filtersRoutes({ commonRouteConfig, elasticsearchPlugin, route }) {
  route({
    method: 'GET',
    path: '/api/ml/filters',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return getAllFilters(callWithRequest).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/filters/_stats',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      return getAllFilterStats(callWithRequest).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'GET',
    path: '/api/ml/filters/{filterId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const filterId = request.params.filterId;
      return getFilter(callWithRequest, filterId).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'PUT',
    path: '/api/ml/filters',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const body = request.payload;
      return newFilter(callWithRequest, body).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'PUT',
    path: '/api/ml/filters/{filterId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const filterId = request.params.filterId;
      const payload = request.payload;
      return updateFilter(
        callWithRequest,
        filterId,
        payload.description,
        payload.addItems,
        payload.removeItems
      ).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });

  route({
    method: 'DELETE',
    path: '/api/ml/filters/{filterId}',
    handler(request) {
      const callWithRequest = callWithRequestFactory(elasticsearchPlugin, request);
      const filterId = request.params.filterId;
      return deleteFilter(callWithRequest, filterId).catch(resp => wrapError(resp));
    },
    config: {
      ...commonRouteConfig,
    },
  });
}
