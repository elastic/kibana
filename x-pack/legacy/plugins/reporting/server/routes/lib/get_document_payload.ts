/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import contentDisposition from 'content-disposition';
import * as _ from 'lodash';
import { oncePerServer } from '../../lib/once_per_server';
import { CSV_JOB_TYPE } from '../../../common/constants';

interface ICustomHeaders {
  [x: string]: any;
}

const DEFAULT_TITLE = 'report';

const getTitle = (exportType: any, title?: string): string =>
  `${title || DEFAULT_TITLE}.${exportType.jobContentExtension}`;

const getReportingHeaders = (output: any, exportType: any) => {
  const metaDataHeaders: ICustomHeaders = {};

  if (exportType.jobType === CSV_JOB_TYPE) {
    const csvContainsFormulas = _.get(output, 'csv_contains_formulas', false);
    const maxSizedReach = _.get(output, 'max_size_reached', false);

    metaDataHeaders['kbn-csv-contains-formulas'] = csvContainsFormulas;
    metaDataHeaders['kbn-max-size-reached'] = maxSizedReach;
  }

  return metaDataHeaders;
};

function getDocumentPayloadFn(server: any) {
  const exportTypesRegistry = server.plugins.reporting.exportTypesRegistry;

  function encodeContent(content: string, exportType: any) {
    switch (exportType.jobContentEncoding) {
      case 'base64':
        return Buffer.from(content, 'base64');
      default:
        return content;
    }
  }

  function getCompleted(output: any, jobType: string, title: any) {
    const exportType = exportTypesRegistry.get((item: any) => item.jobType === jobType);
    const filename = getTitle(exportType, title);
    const headers = getReportingHeaders(output, exportType);

    return {
      statusCode: 200,
      content: encodeContent(output.content, exportType),
      contentType: output.content_type,
      headers: {
        ...headers,
        'Content-Disposition': contentDisposition(filename, { type: 'inline' }),
      },
    };
  }

  function getFailure(output: any) {
    return {
      statusCode: 500,
      content: {
        message: 'Reporting generation failed',
        reason: output.content,
      },
      contentType: 'application/json',
    };
  }

  function getIncomplete(status: any) {
    return {
      statusCode: 503,
      content: status,
      contentType: 'application/json',
      headers: {
        'retry-after': 30,
      },
    };
  }

  return function getDocumentPayload(doc: any) {
    const { status, output, jobtype: jobType, payload: { title } = { title: '' } } = doc._source;

    if (status === 'completed') {
      return getCompleted(output, jobType, title);
    }

    if (status === 'failed') {
      return getFailure(output);
    }

    // send a 503 indicating that the report isn't completed yet
    return getIncomplete(status);
  };
}

export const getDocumentPayloadFactory = oncePerServer(getDocumentPayloadFn);
