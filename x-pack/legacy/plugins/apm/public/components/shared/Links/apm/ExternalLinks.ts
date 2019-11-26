/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { IBasePath } from 'kibana/server';
import url from 'url';

export const getTraceUrl = (
  kibanaBasePath: IBasePath,
  traceId: number | string
) =>
  url.format({
    pathname: kibanaBasePath.prepend('/apm/apm'),
    hash: `/link-to/trace/${traceId}`
  });
