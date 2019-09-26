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
import { KbnServer } from '../../../types';
import { JobDocPayloadPNG } from '../../png/types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';

interface KeyedRelativeUrl {
  relativeUrl: string;
}

export async function getFullUrls({
  job,
  server,
  ...mergeValues // pass-throughs
}: {
  job: JobDocPayloadPNG | JobDocPayloadPDF;
  server: KbnServer;
}) {
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);

  // PDF and PNG job params put in the url differently
  let relativeUrls: string[] = [];

  if (job.relativeUrl) {
    // single page (png)
    relativeUrls = [job.relativeUrl];
  } else if (job.objects) {
    // multi page (pdf)
    relativeUrls = job.objects.map((obj: KeyedRelativeUrl) => obj.relativeUrl);
  } else {
    throw new Error(
      `No valid URL fields found in Job Params! Expected \`job.relativeUrl\` or \`job.objects[{ relativeUrl }]\``
    );
  }

  const urls = relativeUrls.map(relativeUrl => {
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

  return { job, urls, server, ...mergeValues };
}
