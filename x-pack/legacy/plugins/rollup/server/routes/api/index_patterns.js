/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import Joi from 'joi';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import indexBy from 'lodash/collection/indexBy';
import { getCapabilitiesForRollupIndices } from '../../lib/map_capabilities';
import { mergeCapabilitiesWithFields } from '../../lib/merge_capabilities_with_fields';
import querystring from 'querystring';

/**
 * Get list of fields for rollup index pattern, in the format of regular index pattern fields
 */
export function registerFieldsForWildcardRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  server.route({
    path: '/api/index_patterns/rollup/_fields_for_wildcard',
    method: 'GET',
    config: {
      pre: [licensePreRouting],
      validate: {
        query: Joi.object()
          .keys({
            pattern: Joi.string().required(),
            meta_fields: Joi.array()
              .items(Joi.string())
              .default([]),
            params: Joi.object()
              .keys({
                rollup_index: Joi.string().required(),
              })
              .required(),
          })
          .default(),
      },
    },
    handler: async request => {
      const { pattern, meta_fields: metaFields, params } = request.query;

      // Format call to standard index pattern `fields for wildcard`
      const standardRequestQuery = querystring.stringify({ pattern, meta_fields: metaFields });
      const standardRequest = {
        url: `${request.getBasePath()}/api/index_patterns/_fields_for_wildcard?${standardRequestQuery}`,
        method: 'GET',
        headers: request.headers,
      };

      try {
        // Make call and use field information from response
        const standardResponse = await server.inject(standardRequest);
        const fields = standardResponse.result && standardResponse.result.fields;

        const rollupIndex = params.rollup_index;
        const callWithRequest = callWithRequestFactory(server, request);

        const rollupFields = [];
        const fieldsFromFieldCapsApi = indexBy(fields, 'name');
        const rollupIndexCapabilities = getCapabilitiesForRollupIndices(
          await callWithRequest('rollup.rollupIndexCapabilities', {
            indexPattern: rollupIndex,
          })
        )[rollupIndex].aggs;

        // Keep meta fields
        metaFields.forEach(
          field => fieldsFromFieldCapsApi[field] && rollupFields.push(fieldsFromFieldCapsApi[field])
        );

        const mergedRollupFields = mergeCapabilitiesWithFields(
          rollupIndexCapabilities,
          fieldsFromFieldCapsApi,
          rollupFields
        );

        return {
          fields: mergedRollupFields,
        };
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }
        return wrapUnknownError(err);
      }
    },
  });
}
