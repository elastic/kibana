/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { RequestHandlerContext } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { licensePreRoutingFactory } from '../new_platform/licence_check_pre_routing_factory';
import { wrapError } from '../client/error_wrapper';
import { RouteInitialization } from '../new_platform/plugin';
import { createFilterSchema, updateFilterSchema } from '../new_platform/filters_schema';
import { FilterManager, FormFilter } from '../models/filter';

// TODO - add function for returning a list of just the filter IDs.
// TODO - add function for returning a list of filter IDs plus item count.
function getAllFilters(context: RequestHandlerContext) {
  const mgr = new FilterManager(context.ml!.mlClient.callAsCurrentUser);
  return mgr.getAllFilters();
}

function getAllFilterStats(context: RequestHandlerContext) {
  const mgr = new FilterManager(context.ml!.mlClient.callAsCurrentUser);
  return mgr.getAllFilterStats();
}

function getFilter(context: RequestHandlerContext, filterId: string) {
  const mgr = new FilterManager(context.ml!.mlClient.callAsCurrentUser);
  return mgr.getFilter(filterId);
}

function newFilter(context: RequestHandlerContext, filter: FormFilter) {
  const mgr = new FilterManager(context.ml!.mlClient.callAsCurrentUser);
  return mgr.newFilter(filter);
}

function updateFilter(context: RequestHandlerContext, filterId: string, filter: FormFilter) {
  const mgr = new FilterManager(context.ml!.mlClient.callAsCurrentUser);
  return mgr.updateFilter(filterId, filter);
}

function deleteFilter(context: RequestHandlerContext, filterId: string) {
  const mgr = new FilterManager(context.ml!.mlClient.callAsCurrentUser);
  return mgr.deleteFilter(filterId);
}

export function filtersRoutes({ xpackMainPlugin, router }: RouteInitialization) {
  /**
   * @apiGroup Filters
   *
   * @api {get} /api/ml/filters Gets filters
   * @apiName GetFilters
   * @apiDescription Retrieves the list of filters which are used for custom rules in anomaly detection.
   *
   * @apiSuccess {Boolean} success
   * @apiSuccess {Object[]} filters list of filters
   */
  router.get(
    {
      path: '/api/ml/filters',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getAllFilters(context);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Filters
   *
   * @api {get} /api/ml/filters/:filterId Gets filter by ID
   * @apiName GetFilterById
   * @apiDescription Retrieves the filter with the specified ID.
   *
   * @apiSuccess {Boolean} success
   * @apiSuccess {Object} filter the filter with the specified ID
   */
  router.get(
    {
      path: '/api/ml/filters/{filterId}',
      validate: {
        params: schema.object({ filterId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getFilter(context, request.params.filterId);
        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Filters
   *
   * @api {put} /api/ml/filters Creates a filter
   * @apiName CreateFilter
   * @apiDescription Instantiates a filter, for use by custom rules in anomaly detection.
   *
   * @apiSuccess {Boolean} success
   * @apiSuccess {Object} filter created filter
   */
  router.put(
    {
      path: '/api/ml/filters',
      validate: {
        body: schema.object(createFilterSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const body = request.body;
        const resp = await newFilter(context, body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Filters
   *
   * @api {put} /api/ml/filters/:filterId Updates a filter
   * @apiName UpdateFilter
   * @apiDescription Updates the  description of a filter, adds items or removes items.
   *
   * @apiSuccess {Boolean} success
   * @apiSuccess {Object} filter updated filter
   */
  router.put(
    {
      path: '/api/ml/filters/{filterId}',
      validate: {
        params: schema.object({ filterId: schema.string() }),
        body: schema.object(updateFilterSchema),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { filterId } = request.params;
        const body = request.body;
        const resp = await updateFilter(context, filterId, body);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Filters
   *
   * @api {delete} /api/ml/filters/:filterId Delete filter
   * @apiName DeleteFilter
   * @apiDescription Deletes the filter with the specified ID.
   *
   * @apiParam {String} filterId the ID of the filter to delete
   */
  router.delete(
    {
      path: '/api/ml/filters/{filterId}',
      validate: {
        params: schema.object({ filterId: schema.string() }),
      },
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const { filterId } = request.params;
        const resp = await deleteFilter(context, filterId);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );

  /**
   * @apiGroup Filters
   *
   * @api {get} /api/ml/filters/_stats Gets filters stats
   * @apiName GetFiltersStats
   * @apiDescription Retrieves the list of filters which are used for custom rules in anomaly detection,
   *          with stats on the list of jobs and detectors which are using each filter.
   *
   * @apiSuccess {Boolean} success
   * @apiSuccess {Object[]} filters list of filters with stats on usage
   */
  router.get(
    {
      path: '/api/ml/filters/_stats',
      validate: false,
    },
    licensePreRoutingFactory(xpackMainPlugin, async (context, request, response) => {
      try {
        const resp = await getAllFilterStats(context);

        return response.ok({
          body: resp,
        });
      } catch (e) {
        return response.customError(wrapError(e));
      }
    })
  );
}
