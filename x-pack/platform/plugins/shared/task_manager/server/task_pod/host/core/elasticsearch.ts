/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Client } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core-http-server';

const buildClientOptions = () => {
  const { ES_URL, ES_API_KEY, ES_USERNAME, ES_PASSWORD } = process.env;
  if (!ES_URL) throw new Error('ES_URL is required');
  return {
    node: ES_URL,
    auth: ES_API_KEY
      ? { apiKey: ES_API_KEY }
      : { username: ES_USERNAME ?? 'elastic', password: ES_PASSWORD ?? 'changeme' },
  };
};

export const createElasticsearchCore = () => {
  const internalClient = new Client(buildClientOptions());

  const asScoped = (request: Pick<KibanaRequest, 'headers'>, _options?: unknown) => {
    // `projectRouting` and other scoped options are accepted and ignored: cross-project search
    // routing is not part of a pod.
    const authorization = request.headers?.authorization;
    const asCurrentUser = authorization
      ? internalClient.child({ headers: { authorization: authorization as string } })
      : internalClient;
    return { asCurrentUser, asInternalUser: internalClient };
  };

  return {
    internalClient,
    start: { client: { asInternalUser: internalClient, asScoped } },
  };
};
