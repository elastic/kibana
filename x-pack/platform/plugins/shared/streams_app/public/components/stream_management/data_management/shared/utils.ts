/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const buildRequestPreviewCodeContent = ({
  method,
  url,
  body,
}: {
  method: string;
  url: string;
  body?: unknown;
}): string => {
  if (body === undefined || body === null) {
    return `${method} ${url}`;
  }

  return [`${method} ${url}`, JSON.stringify(body, null, 2)].join('\n');
};
