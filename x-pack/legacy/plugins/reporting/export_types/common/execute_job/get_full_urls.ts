/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  format as urlFormat,
  parse as urlParse,
  UrlWithStringQuery,
  UrlWithParsedQuery,
} from 'url';
import { getAbsoluteUrlFactory } from '../../../common/get_absolute_url';
import { validateUrls } from '../../../common/validate_urls';
import { ReportingConfig } from '../../../server';
import { JobDocPayloadPNG } from '../../png/types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';

function isPngJob(job: JobDocPayloadPNG | JobDocPayloadPDF): job is JobDocPayloadPNG {
  return (job as JobDocPayloadPNG).relativeUrl !== undefined;
}
function isPdfJob(job: JobDocPayloadPNG | JobDocPayloadPDF): job is JobDocPayloadPDF {
  return (job as JobDocPayloadPDF).relativeUrls !== undefined;
}

export function getFullUrls<JobDocPayloadType>({
  config,
  job,
}: {
  config: ReportingConfig;
  job: JobDocPayloadPDF | JobDocPayloadPNG;
}) {
  const [basePath, protocol, hostname, port] = [
    config.kbnConfig.get('server', 'basePath'),
    config.get('kibanaServer', 'protocol'),
    config.get('kibanaServer', 'hostname'),
    config.get('kibanaServer', 'port'),
  ] as string[];
  const getAbsoluteUrl = getAbsoluteUrlFactory({
    defaultBasePath: basePath,
    protocol,
    hostname,
    port,
  });

  // PDF and PNG job params put in the url differently
  let relativeUrls: string[] = [];

  if (isPngJob(job)) {
    relativeUrls = [job.relativeUrl];
  } else if (isPdfJob(job)) {
    relativeUrls = job.relativeUrls;
  } else {
    throw new Error(
      `No valid URL fields found in Job Params! Expected \`job.relativeUrl: string\` or \`job.relativeUrls: string[]\``
    );
  }

  validateUrls(relativeUrls);

  const urls = relativeUrls.map((relativeUrl) => {
    const parsedRelative: UrlWithStringQuery = urlParse(relativeUrl);
    const jobUrl = getAbsoluteUrl({
      basePath: job.basePath,
      path: parsedRelative.pathname,
      hash: parsedRelative.hash,
      search: parsedRelative.search,
    });

    // capture the route to the visualization
    const parsed: UrlWithParsedQuery = urlParse(jobUrl, true);
    if (parsed.hash == null) {
      throw new Error(
        'No valid hash in the URL! A hash is expected for the application to route to the intended visualization.'
      );
    }

    // allow the hash check to perform first
    if (!job.forceNow) {
      return jobUrl;
    }

    const visualizationRoute: UrlWithParsedQuery = urlParse(parsed.hash.replace(/^#/, ''), true);

    // combine the visualization route and forceNow parameter into a URL
    const transformedHash = urlFormat({
      pathname: visualizationRoute.pathname,
      query: {
        ...visualizationRoute.query,
        forceNow: job.forceNow,
      },
    });

    return urlFormat({
      ...parsed,
      hash: transformedHash,
    });
  });

  return urls;
}
