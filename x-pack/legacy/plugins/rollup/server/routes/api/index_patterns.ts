/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { schema } from '@kbn/config-schema';
import { RequestHandler } from 'src/core/server';

import { indexBy } from 'lodash';
import { IndexPatternsFetcher } from '../../shared_imports';
import { RouteDependencies, ServerShim } from '../../types';
import { callWithRequestFactory } from '../../lib/call_with_request_factory';
import { isEsError } from '../../lib/is_es_error';
import { licensePreRoutingFactory } from '../../lib/license_pre_routing_factory';
import { getCapabilitiesForRollupIndices } from '../../lib/map_capabilities';
import { mergeCapabilitiesWithFields, Field } from '../../lib/merge_capabilities_with_fields';

const parseMetaFields = (metaFields: string | string[]) => {
  let parsedFields: string[] = [];
  if (typeof metaFields === 'string') {
    parsedFields = JSON.parse(metaFields);
  } else {
    parsedFields = metaFields;
  }
  return parsedFields;
};

const getFieldsForWildcardRequest = async (context: any, request: any, response: any) => {
  const { callAsCurrentUser } = context.core.elasticsearch.dataClient;
  const indexPatterns = new IndexPatternsFetcher(callAsCurrentUser);
  const { pattern, meta_fields: metaFields } = request.query;

  let parsedFields: string[] = [];
  try {
    parsedFields = parseMetaFields(metaFields);
  } catch (error) {
    return response.badRequest({
      body: error,
    });
  }

  try {
    const fields = await indexPatterns.getFieldsForWildcard({
      pattern,
      metaFields: parsedFields,
    });

    return response.ok({
      body: { fields },
      headers: {
        'content-type': 'application/json',
      },
    });
  } catch (error) {
    return response.notFound();
  }
};

/**
 * Get list of fields for rollup index pattern, in the format of regular index pattern fields
 */
export function registerFieldsForWildcardRoute(deps: RouteDependencies, legacy: ServerShim) {
  const handler: RequestHandler<any, any, any> = async (ctx, request, response) => {
    const { params, meta_fields: metaFields } = request.query;

    try {
      // Make call and use field information from response
      const { payload } = await getFieldsForWildcardRequest(ctx, request, response);
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
          meta_fields: schema.arrayOf(schema.string(), {
            defaultValue: [],
          }),
          params: schema.string({
            validate(value) {
              try {
                const params = JSON.parse(value);
                const keys = Object.keys(params);
                const { rollup_index: rollupIndex } = params;

                if (!rollupIndex) {
                  return '[request query.params]: "rollup_index" is required';
                } else if (keys.length > 1) {
                  const invalidParams = keys.filter(key => key !== 'rollup_index');
                  return `[request query.params]: ${invalidParams.join(', ')} is not allowed`;
                }
              } catch (err) {
                return '[request query.params]: expected JSON string';
              }
            },
          }),
        }),
      },
    },
    licensePreRoutingFactory(legacy, handler)
  );
}
