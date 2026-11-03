/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreContext } from '@kbn/core-base-server-internal';
import {
  AgentManager,
  ClusterClient,
  getRequestHandlerFactory,
} from '@kbn/core-elasticsearch-client-server-internal';
import {
  ElasticsearchConfig,
  configSchema,
} from '@kbn/core-elasticsearch-server-internal/src/elasticsearch_config';
import { mergeConfig } from '@kbn/core-elasticsearch-server-internal/src/merge_config';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';

/**
 * The pod's Elasticsearch config: Core's own schema and `ElasticsearchConfig` over `ES_URL`,
 * `ES_USERNAME`/`ES_PASSWORD` or `ES_API_KEY`, and the optional `elasticsearch.*` section of
 * `POD_CONFIG` (TLS, timeouts, ...).
 */
const buildElasticsearchConfig = (podConfig: Record<string, unknown>) => {
  const { ES_URL, ES_API_KEY, ES_USERNAME, ES_PASSWORD } = process.env;
  if (!ES_URL) throw new Error('ES_URL is required');
  const section = (podConfig.elasticsearch as Record<string, unknown> | undefined) ?? {};
  const customHeaders = {
    ...(section.customHeaders as Record<string, string> | undefined),
    ...(ES_API_KEY ? { authorization: `ApiKey ${ES_API_KEY}` } : {}),
  };
  // Credentials are not validated by Core's schema: it forbids the `elastic` superuser, which is a
  // legitimate pod user in development (the pod's contract is `ES_USERNAME` defaulting to `elastic`).
  const { username: _u, password: _p, serviceAccountToken: _t, ...rest } = section;
  const validated = configSchema.validate(
    { ...rest, hosts: [ES_URL], customHeaders },
    { dev: false, prod: true, dist: true, serverless: false }
  );
  const credentials = ES_API_KEY
    ? {}
    : { username: ES_USERNAME ?? 'elastic', password: ES_PASSWORD ?? 'changeme' };
  return new ElasticsearchConfig({ ...validated, ...credentials });
};

/**
 * Core's `ClusterClient` (the class `ElasticsearchService` creates for `elasticsearch.client`), over
 * the pod's config. `ElasticsearchService` itself is not used: its setup needs the HTTP service,
 * execution context and security setup contracts, and it polls the cluster's nodes, clock skew and
 * cluster info for the lifetime of the process and blocks start on a successful version check,
 * which needs cluster privileges an API key-only pod does not have.
 *
 * A scoped client needs no `authHeaders` storage: fake requests carry their own `authorization`
 * header, which `ClusterClient.asScoped` reads as it does for Kibana's own fake requests.
 */
export const createElasticsearchCore = (
  coreContext: CoreContext,
  podConfig: Record<string, unknown>
) => {
  const config = buildElasticsearchConfig(podConfig);
  const log = coreContext.logger.get('elasticsearch');
  const agentManager = new AgentManager(log.get('agent-manager'), {
    dnsCacheTtlInSeconds: config.dnsCacheTtl?.asSeconds() ?? 0,
  });
  const onRequestHandlerFactory = getRequestHandlerFactory(false);
  const createClusterClient = (
    type: string,
    clientConfig: Partial<ElasticsearchClientConfig> = {}
  ) =>
    new ClusterClient({
      config: mergeConfig(config, clientConfig),
      logger: log,
      type,
      agentFactoryProvider: agentManager,
      kibanaVersion: coreContext.env.packageInfo.version,
      onRequestHandlerFactory,
    });
  const client = createClusterClient('data');

  return {
    internalClient: client.asInternalUser,
    start: {
      client: { asInternalUser: client.asInternalUser, asScoped: client.asScoped.bind(client) },
      createClient: createClusterClient,
      getCapabilities: () => ({ serverless: false }),
    },
    stop: () => client.close(),
  };
};
