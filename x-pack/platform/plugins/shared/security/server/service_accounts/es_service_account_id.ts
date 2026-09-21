/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { serviceAccountNameSchema } from '../../common/service_accounts';

export interface EsServiceAccountPrincipal {
  namespace: string;
  name: string;
}

/**
 * Splits an Elasticsearch service account id, `{namespace}/{service}`, into its two parts, or
 * returns `undefined` when the id cannot name an Elasticsearch account at all. Both parts are
 * held to the same rules Elasticsearch applies to them, which is also what keeps either half from
 * carrying a second slash into a URL path.
 */
export const parseEsServiceAccountId = (id: string): EsServiceAccountPrincipal | undefined => {
  const parts = id.split('/');
  if (parts.length !== 2) {
    return undefined;
  }

  const [namespace, name] = parts;
  if (
    !serviceAccountNameSchema.safeParse(namespace).success ||
    !serviceAccountNameSchema.safeParse(name).success
  ) {
    return undefined;
  }

  return { namespace, name };
};
