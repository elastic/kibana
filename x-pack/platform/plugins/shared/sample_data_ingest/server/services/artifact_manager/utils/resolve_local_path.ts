/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function resolveLocalPath(parsedUrl: URL): string {
  if (parsedUrl.protocol !== 'file:') {
    throw new Error(`Expected file URL, got ${parsedUrl.protocol}`);
  }
  const filePath = parsedUrl.pathname;

  // On Windows, remove leading "/" (e.g., file:///C:/path should be C:/path)
  return process.platform === 'win32' && filePath.startsWith('/')
    ? filePath.substring(1)
    : filePath;
}
