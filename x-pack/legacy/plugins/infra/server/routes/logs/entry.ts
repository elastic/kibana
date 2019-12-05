/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { schema } from '@kbn/config-schema';
import { sortBy } from 'lodash';
import { throwErrors } from '../../../common/runtime_types';
import { InfraBackendLibs } from '../../lib/infra_types';
import {
  LOG_ENTRY_PATH,
  logEntryRequestRT,
  logEntryResponseRT,
} from '../../../common/http_api/logs';

import { convertDocumentSourceToLogItemFields } from '../../lib/domains/log_entries_domain/convert_document_source_to_log_item_fields';
import { JsonObject } from '../../../common/typed_json';

const escapeHatch = schema.object({}, { allowUnknowns: true });

interface LogEntryHit {
  _index: string;
  _id: string;
  _source: JsonObject;
  sort: [number, number];
}

export const initLogEntryRoute = ({ framework, sources }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRY_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          logEntryRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { sourceId, id } = payload;

        const sourceConfiguration = (await sources.getSourceConfiguration(requestContext, sourceId))
          .configuration;

        const esResults = await framework.callWithRequest<LogEntryHit>(requestContext, 'search', {
          index: sourceConfiguration.logAlias,
          terminate_after: 1,
          body: {
            size: 1,
            query: {
              ids: { values: [id] },
            },
            sort: [
              { [sourceConfiguration.fields.timestamp]: 'desc' },
              { [sourceConfiguration.fields.tiebreaker]: 'desc' },
            ],
          },
        });

        if (esResults.hits.total.value < 1) {
          return response.notFound();
        }

        const hit = esResults.hits.hits[0];

        const fields = convertDocumentSourceToLogItemFields(hit._source);
        fields.push({ field: '_id', value: id });
        fields.push({ field: '_index', value: hit._index });

        return response.ok({
          body: logEntryResponseRT.encode({
            data: {
              id,
              index: hit._index,
              fields: sortBy(fields, 'field'),
              key: {
                time: hit.sort[0],
                tiebreaker: hit.sort[1],
              },
            },
          }),
        });
      } catch (error) {
        return response.internalError({
          body: error.message,
        });
      }
    }
  );
};
