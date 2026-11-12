/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ES_SERVICE_ACCOUNT_NAMESPACE,
  SERVICE_ACCOUNT_NAME_MAX_LENGTH,
  SERVICE_ACCOUNT_NAME_REGEX,
} from '../../common/service_accounts';

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

/**
 * Parses the id of an account Kibana can run as: one in Kibana's own namespace, with a name
 * Kibana would create. Returns `undefined` for any other id.
 */
export const parseBindableEsServiceAccountId = (
  id: string
): EsServiceAccountPrincipal | undefined => {
  const principal = parseEsServiceAccountId(id);
  if (
    !principal ||
    principal.namespace !== ES_SERVICE_ACCOUNT_NAMESPACE ||
    principal.name.length > SERVICE_ACCOUNT_NAME_MAX_LENGTH ||
    !SERVICE_ACCOUNT_NAME_REGEX.test(principal.name)
  ) {
    return undefined;
  }

  return principal;
};
