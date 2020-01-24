/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';

import { indexBy } from 'lodash';
import { getFieldsForWildcard } from '../../shared_imports';
import { RouteDependencies, ServerShim } from '../../types';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsError } from '../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { getCapabilitiesForRollupIndices } from '../../lib/map_capabilities';
import { mergeCapabilitiesWithFields, Field } from '../../lib/merge_capabilities_with_fields';

/**
 * Get list of fields for rollup index pattern, in the format of regular index pattern fields
 */
export function registerFieldsForWildcardRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const { params, meta_fields: metaFields } = request.query;

    try {
      // Make call and use field information from response
      const { payload } = await getFieldsForWildcard(ctx, request, response);
      const fields = payload.fields;
      const parsedParams = JSON.parse(params);
      const rollupIndex = parsedParams.rollup_index;
      const callWithRequest = callWithRequestFactory(deps.elasticsearchService, request);
      const rollupFields: Field[] = [];
      const fieldsFromFieldCapsApi: { [key: string]: any } = indexBy(fields, 'name');
      const rollupIndexCapabilities = getCapabilitiesForRollupIndices(
        await callWithRequest('rollup.rollupIndexCapabilities', {
          indexPattern: rollupIndex,
        })
      )[rollupIndex].aggs;

      // Keep meta fields
      metaFields.forEach(
        (field: string) =>
          fieldsFromFieldCapsApi[field] && rollupFields.push(fieldsFromFieldCapsApi[field])
      );

      const mergedRollupFields = mergeCapabilitiesWithFields(
        rollupIndexCapabilities,
        fieldsFromFieldCapsApi,
        rollupFields
      );

      return response.ok({ body: { fields: mergedRollupFields } });
    } catch (err) {
      if (isEsError(err)) {
        return response.customError({ statusCode: err.statusCode, body: err });
      }
      return response.internalError({ body: err });
    }
  };

  deps.router.get(
    {
      path: '/api/index_patterns/rollup/_fields_for_wildcard',
      validate: {
        query: schema.object({
          pattern: schema.string(),
          meta_fields: schema.oneOf([schema.string(), schema.arrayOf(schema.string())], {
            defaultValue: [],
          }),
          params: schema.string(),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
