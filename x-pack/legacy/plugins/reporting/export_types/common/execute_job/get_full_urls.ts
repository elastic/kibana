/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { format as urlFormat, parse as urlParse } from 'url';
import { getAbsoluteUrlFactory } from '../../../common/get_absolute_url';
import { KbnServer } from '../../../types';
import { JobDocPayloadPNG } from '../../png/types';
import { JobDocPayloadPDF } from '../../printable_pdf/types';

interface KeyedRelativeUrl {
  relativeUrl: string;
}

export const getFullUrls = async ({
  job,
  server,
  ...mergeValues // caller's mergeMap passes props we only need to pass through
}: {
  job: JobDocPayloadPNG | JobDocPayloadPDF;
  server: KbnServer;
}) => {
  const getAbsoluteUrl = getAbsoluteUrlFactory(server);

  // PDF and PNG job params put in the url differently
  let relativeUrls: string[] = [];

  if (job.relativeUrl) {
    // single page (png)
    relativeUrls = [job.relativeUrl];
  } else if (job.objects) {
    // multi page (pdf)
    relativeUrls = job.objects.map((obj: KeyedRelativeUrl) => obj.relativeUrl);
  }

  const absoluteUrls = relativeUrls.map(relativeUrl => {
    const { pathname: path, hash, search } = urlParse(relativeUrl);
    return getAbsoluteUrl({ basePath: job.basePath, path, hash, search });
  });

  // why 2 maps
  const urls = absoluteUrls.map((jobUrl: string) => {
    if (!job.forceNow) {
      return jobUrl;
    }

    const parsed: any = urlParse(jobUrl, true);
    const hash: any = urlParse(parsed.hash.replace(/^#/, ''), true);

    const transformedHash = urlFormat({
      pathname: hash.pathname,
      query: {
        ...hash.query,
        forceNow: job.forceNow,
      },
    });

    return urlFormat({
      ...parsed,
      hash: transformedHash,
    });
  });

  return { job, urls, server, ...mergeValues };
};
