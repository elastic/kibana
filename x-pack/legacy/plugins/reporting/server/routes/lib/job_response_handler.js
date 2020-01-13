/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import boom from 'boom';
import { jobsQueryFactory } from '../../lib/jobs_query';
import { WHITELISTED_JOB_CONTENT_TYPES } from '../../../common/constants';
import { getDocumentPayloadFactory } from './get_document_payload';

export function jobResponseHandlerFactory(server, exportTypesRegistry) {
  const jobsQuery = jobsQueryFactory(server);
  const getDocumentPayload = getDocumentPayloadFactory(server, exportTypesRegistry);

  return function jobResponseHandler(validJobTypes, user, h, params, opts = {}) {
    const { docId } = params;
    return jobsQuery.get(user, docId, { includeContent: !opts.excludeContent }).then(doc => {
      if (!doc) return boom.notFound();

      const { jobtype: jobType } = doc._source;
      if (!validJobTypes.includes(jobType)) {
        return boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
      }

      const output = getDocumentPayload(doc);

      if (!WHITELISTED_JOB_CONTENT_TYPES.includes(output.contentType)) {
        return boom.badImplementation(
          `Unsupported content-type of ${output.contentType} specified by job output`
        );
      }

      const response = h
        .response(output.content)
        .type(output.contentType)
        .code(output.statusCode);

      if (output.headers) {
        Object.keys(output.headers).forEach(key => {
          response.header(key, output.headers[key]);
        });
      }

      return response;
    });
  };
}
