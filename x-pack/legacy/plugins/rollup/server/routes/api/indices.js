/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsErrorFactory } from '../../lib/is_es_error_factory';
import { wrapEsError, wrapUnknownError } from '../../lib/error_wrappers';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { getCapabilitiesForRollupIndices } from '../../lib/map_capabilities';

function isNumericField(fieldCapability) {
  const numericTypes = [
    'long',
    'integer',
    'short',
    'byte',
    'double',
    'float',
    'half_float',
    'scaled_float',
  ];
  return numericTypes.some(numericType => fieldCapability[numericType] != null);
}

export function registerIndicesRoute(server) {
  const isEsError = isEsErrorFactory(server);
  const licensePreRouting = licensePreRoutingFactory(server);

  /**
   * Returns a list of all rollup index names
   */
  server.route({
    path: '/api/rollup/indices',
    method: 'GET',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);
      try {
        const data = await callWithRequest('rollup.rollupIndexCapabilities', {
          indexPattern: '_all',
        });
        return getCapabilitiesForRollupIndices(data);
      } catch (err) {
        if (isEsError(err)) {
          return wrapEsError(err);
        }
        return wrapUnknownError(err);
      }
    },
  });

  /**
   * Returns information on validity of an index pattern for creating a rollup job:
   *  - Does the index pattern match any indices?
   *  - Does the index pattern match rollup indices?
   *  - Which date fields, numeric fields, and keyword fields are available in the matching indices?
   */
  server.route({
    path: '/api/rollup/index_pattern_validity/{indexPattern}',
    method: 'GET',
    config: {
      pre: [licensePreRouting],
    },
    handler: async request => {
      const callWithRequest = callWithRequestFactory(server, request);

      try {
        const { indexPattern } = request.params;
        const [fieldCapabilities, rollupIndexCapabilities] = await Promise.all([
          callWithRequest('rollup.fieldCapabilities', { indexPattern }),
          callWithRequest('rollup.rollupIndexCapabilities', { indexPattern }),
        ]);

        const doesMatchIndices = Object.entries(fieldCapabilities.fields).length !== 0;
        const doesMatchRollupIndices = Object.entries(rollupIndexCapabilities).length !== 0;

        const dateFields = [];
        const numericFields = [];
        const keywordFields = [];

        const fieldCapabilitiesEntries = Object.entries(fieldCapabilities.fields);
        fieldCapabilitiesEntries.forEach(([fieldName, fieldCapability]) => {
          if (fieldCapability.date) {
            dateFields.push(fieldName);
            return;
          }

          if (isNumericField(fieldCapability)) {
            numericFields.push(fieldName);
            return;
          }

          if (fieldCapability.keyword) {
            keywordFields.push(fieldName);
          }
        });

        return {
          doesMatchIndices,
          doesMatchRollupIndices,
          dateFields,
          numericFields,
          keywordFields,
        };
      } catch (err) {
        // 404s are still valid results.
        if (err.statusCode === 404) {
          return {
            doesMatchIndices: false,
            doesMatchRollupIndices: false,
            dateFields: [],
            numericFields: [],
            keywordFields: [],
          };
        }

        if (isEsError(err)) {
          return wrapEsError(err);
        }

        return wrapUnknownError(err);
      }
    },
  });
}
