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
import datemath from '@elastic/datemath';

import { throwErrors } from '../../../common/runtime_types';

import { InfraBackendLibs } from '../../lib/infra_types';
import {
  ESDate,
  LOG_ENTRIES_PATH,
  logEntriesRequestRT,
  logEntriesResponseRT,
} from '../../../common/http_api/log_entries';
import { parseFilterQuery } from '../../utils/serialized_query';

const escapeHatch = schema.object({}, { allowUnknowns: true });

export const initLogEntriesRoute = ({ framework, logEntries }: InfraBackendLibs) => {
  framework.registerRoute(
    {
      method: 'post',
      path: LOG_ENTRIES_PATH,
      validate: { body: escapeHatch },
    },
    async (requestContext, request, response) => {
      try {
        const payload = pipe(
          logEntriesRequestRT.decode(request.body),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const { startDate, endDate, sourceId, query } = payload;

        const startTimestamp = parseDate(startDate);
        const endTimestamp = parseDate(endDate);

        if (!startTimestamp || !endTimestamp) {
          return response.badRequest();
        }

        const entries = await logEntries.getLogEntries(
          requestContext,
          sourceId,
          startTimestamp,
          endTimestamp
        );

        return response.ok({
          body: logEntriesResponseRT.encode({
            data: {
              entries,
              topCursor: entries[0].cursor,
              bottomCursor: entries[entries.length - 1].cursor,
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

function parseDate(date: ESDate): number | undefined {
  if (typeof date === 'number') {
    return date;
  }

  const parsedDate = datemath.parse(date);

  if (parsedDate) {
    return parsedDate.valueOf();
  }
}
