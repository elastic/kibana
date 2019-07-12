/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import url from 'url';
import { getAbsoluteUrlFactory } from '../../../common/get_absolute_url';
import { ConditionalHeaders, JobDocPayload, KbnServer } from '../../../types';

function getSavedObjectAbsoluteUrl(job: JobDocPayload, relativeUrl: string, server: KbnServer) {
  const getAbsoluteUrl: any = getAbsoluteUrlFactory(server);

  const { pathname: path, hash, search } = url.parse(relativeUrl);
  return getAbsoluteUrl({ basePath: job.basePath, path, hash, search });
}

export const addForceNowQuerystring = async ({
  job,
  conditionalHeaders,
  logo,
  server,
}: {
  job: JobDocPayload;
  conditionalHeaders?: ConditionalHeaders;
  logo?: any;
  server: KbnServer;
}) => {
  // if no URLS then its from PNG which should only have one so put it in the array and process as PDF does
  if (!job.urls) {
    if (!job.relativeUrl) {
      throw new Error(`Unable to generate report. Url is not defined.`);
    }
    job.urls = [getSavedObjectAbsoluteUrl(job, job.relativeUrl, server)];
  }

  const urls = job.urls.map((jobUrl: string) => {
    if (!job.forceNow) {
      return jobUrl;
    }

    const parsed: any = url.parse(jobUrl, true);
    const hash: any = url.parse(parsed.hash.replace(/^#/, ''), true);

    const transformedHash = url.format({
      pathname: hash.pathname,
      query: {
        ...hash.query,
        forceNow: job.forceNow,
      },
    });

    return url.format({
      ...parsed,
      hash: transformedHash,
    });
  });

  return { job, conditionalHeaders, logo, urls, server };
};
