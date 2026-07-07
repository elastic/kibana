/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const KIBANA_PREFIX = 'kbn:';

export const buildRequestPreviewCodeContent = ({
  method,
  url,
  body,
}: {
  method: string;
  url: string;
  body?: unknown;
}): string => {
  const requestUrl = url.startsWith(KIBANA_PREFIX) ? url : `${KIBANA_PREFIX}${url}`;

  if (body === undefined || body === null) {
    return `${method} ${requestUrl}`;
  }

  return [`${method} ${requestUrl}`, JSON.stringify(body, null, 2)].join('\n');
};
