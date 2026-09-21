/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** `{credentialId}.{secret}` — credential id is a generated SO id and never contains `.`. */
export const composeIngestToken = (credentialId: string, secret: string): string =>
  `${credentialId}.${secret}`;

export const parseIngestToken = (
  token: string
): { credentialId: string; secret: string } | undefined => {
  const separatorIndex = token.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
    return undefined;
  }
  return {
    credentialId: token.slice(0, separatorIndex),
    secret: token.slice(separatorIndex + 1),
  };
};
