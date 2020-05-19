/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
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

  return async function jobResponseHandler(
    validJobTypes: string[],
    username: string,
    params: JobResponseHandlerParams,
    opts: JobResponseHandlerOpts = {}
  ) {
    const { docId } = params;

    const doc = await jobsQuery.get(username, docId, { includeContent: !opts.excludeContent });
    if (!doc) throw Boom.notFound();

    const { jobtype: jobType } = doc._source;

    if (!validJobTypes.includes(jobType)) {
      throw Boom.unauthorized(`Sorry, you are not authorized to download ${jobType} reports`);
    }

    const output = getDocumentPayload(doc);

    if (!WHITELISTED_JOB_CONTENT_TYPES.includes(output.contentType)) {
      throw Boom.badImplementation(
        `Unsupported content-type of ${output.contentType} specified by job output`
      );
    }

    return output;
  };
}

export function deleteJobResponseHandlerFactory(
  config: ReportingConfig,
  elasticsearch: ElasticsearchServiceSetup
) {
  const jobsQuery = jobsQueryFactory(config, elasticsearch);

  return async function deleteJobResponseHander(
    validJobTypes: string[],
    username: string,
    params: JobResponseHandlerParams
  ) {
    const { docId } = params;
    const doc = await jobsQuery.get(username, docId, { includeContent: false });
    if (!doc) throw Boom.notFound();

    const { jobtype: jobType } = doc._source;
    if (!validJobTypes.includes(jobType)) {
      throw Boom.unauthorized(`Sorry, you are not authorized to delete ${jobType} reports`);
    }

    try {
      const docIndex = doc._index;
      await jobsQuery.delete(docIndex, docId);
      return { deleted: true };
    } catch (error) {
      throw Boom.boomify(error, { statusCode: error.statusCode });
    }
  };
}
