/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { ResponseToolkit } from 'hapi';
import { ElasticsearchServiceSetup } from 'kibana/server';
import { ReportingConfig } from '../../';
import { WHITELISTED_JOB_CONTENT_TYPES } from '../../../common/constants';
import { ExportTypesRegistry } from '../../lib/export_types_registry';
import { jobsQueryFactory } from '../../lib/jobs_query';
import { getDocumentPayloadFactory } from './get_document_payload';

interface JobResponseHandlerParams {
  docId: string;
}

interface JobResponseHandlerOpts {
  excludeContent?: boolean;
}

export function downloadJobResponseHandlerFactory(
  config: ReportingConfig,
  elasticsearch: ElasticsearchServiceSetup,
  exportTypesRegistry: ExportTypesRegistry
) {
  const jobsQuery = jobsQueryFactory(config, elasticsearch);
  const getDocumentPayload = getDocumentPayloadFactory(exportTypesRegistry);

  return function jobResponseHandler(
    validJobTypes: string[],
    user: any,
    h: ResponseToolkit,
    params: JobResponseHandlerParams,
    opts: JobResponseHandlerOpts = {}
  ) {
    const { docId } = params;
    // TODO: async/await
    return jobsQuery.get(user, docId, { includeContent: !opts.excludeContent }).then((doc) => {
      if (!doc) return Boom.notFound();

      const { jobtype: jobType } = doc._source;
      if (!validJobTypes.includes(jobType)) {
        return Boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
      }

      const output = getDocumentPayload(doc);

      if (!WHITELISTED_JOB_CONTENT_TYPES.includes(output.contentType)) {
        return Boom.badImplementation(
          `Unsupported content-type of ${output.contentType} specified by job output`
        );
      }

      const response = h.response(output.content).type(output.contentType).code(output.statusCode);

      if (output.headers) {
        Object.keys(output.headers).forEach((key) => {
          response.header(key, output.headers[key]);
        });
      }

      return response; // Hapi
    });
  };
}

export function deleteJobResponseHandlerFactory(
  config: ReportingConfig,
  elasticsearch: ElasticsearchServiceSetup
) {
  const jobsQuery = jobsQueryFactory(config, elasticsearch);

  return async function deleteJobResponseHander(
    validJobTypes: string[],
    user: any,
    h: ResponseToolkit,
    params: JobResponseHandlerParams
  ) {
    const { docId } = params;
    const doc = await jobsQuery.get(user, docId, { includeContent: false });
    if (!doc) return Boom.notFound();

    const { jobtype: jobType } = doc._source;
    if (!validJobTypes.includes(jobType)) {
      return Boom.unauthorized(`Sorry, you are not authorized to delete ${jobType} reports`);
    }

    try {
      const docIndex = doc._index;
      await jobsQuery.delete(docIndex, docId);
      return h.response({ deleted: true });
    } catch (error) {
      return Boom.boomify(error, { statusCode: error.statusCode });
    }
  };
}
