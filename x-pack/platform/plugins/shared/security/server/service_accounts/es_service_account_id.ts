/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EsServiceAccountPrincipal {
  namespace: string;
  name: string;
}

/**
 * Splits an Elasticsearch service account id, `{namespace}/{service}`, into its two parts, or
 * returns `undefined` when the id is not shaped like one.
 */
export const parseEsServiceAccountId = (id: string): EsServiceAccountPrincipal | undefined => {
  const parts = id.split('/');
  if (parts.length !== 2) {
    return undefined;
  }

  const [namespace, name] = parts;
  return { namespace, name };
};
