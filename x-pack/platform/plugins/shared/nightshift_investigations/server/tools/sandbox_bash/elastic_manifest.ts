/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SandboxApiClient } from './grpc_client';

/**
 * How the sandbox authenticates to Elasticsearch: `basic` (user + password), `apiKey` (the
 * password secret is a raw API key) or `header` (a preconfigured `Authorization` secret header).
 */
export type ElasticManifestAuth = 'basic' | 'apiKey' | 'header';

export const DEFAULT_READABLE_INDICES = 'Readable indices: `logs-*`, `metrics-*`, `traces-*`.';

const curlAuthFor = (auth: ElasticManifestAuth): string => {
  switch (auth) {
    case 'basic':
      return '-u "$CONNECTOR_SECRET_USER:$CONNECTOR_SECRET_PASSWORD"';
    case 'header':
      return '-H "Authorization: $CONNECTOR_SECRET_HEADER_AUTHORIZATION"';
    default:
      return '-H "Authorization: ApiKey $CONNECTOR_SECRET_PASSWORD"';
  }
};

const credentialLinesFor = (auth: ElasticManifestAuth): string[] => {
  switch (auth) {
    case 'basic':
      return [
        '- `CONNECTOR_SECRET_USER` — Elasticsearch username',
        '- `CONNECTOR_SECRET_PASSWORD` — Elasticsearch password, used with basic auth',
      ];
    case 'header':
      return [
        '- `CONNECTOR_SECRET_HEADER_AUTHORIZATION` — complete `Authorization` header value, sent as `-H "Authorization: $CONNECTOR_SECRET_HEADER_AUTHORIZATION"`',
      ];
    default:
      return [
        '- `CONNECTOR_SECRET_PASSWORD` — Elasticsearch API key, used as `Authorization: ApiKey <key>`',
      ];
  }
};

/** How to query cluster telemetry from the sandbox. Names env vars; never embeds secrets. */
export const renderElasticManifest = (
  connectorId: string,
  auth: ElasticManifestAuth = 'apiKey',
  { readableIndices = DEFAULT_READABLE_INDICES }: { readableIndices?: string } = {}
): string => {
  const curlAuth = curlAuthFor(auth);
  return [
    '# Elasticsearch telemetry',
    '',
    `Query this cluster by passing \`connector_id: "${connectorId}"\` to \`nightshift_sandbox_bash\`.`,
    'Credentials are not stored here: for that single command only, the environment contains',
    '',
    '- `CONNECTOR_CONFIG_URL` — Elasticsearch URL',
    ...credentialLinesFor(auth),
    '',
    'Reference those variables directly and never hard-code their values. A command that omits',
    '`connector_id` gets no credentials and cannot reach Elasticsearch.',
    '',
    readableIndices.trim(),
    '',
    '## Query rules',
    '',
    '- Add `--max-time 120` to every curl and a `@timestamp` range to every query; unbounded',
    '  queries time out and tie up the cluster.',
    '- Discover fields with one `_field_caps` call on a narrow index pattern before querying.',
    '- Patterns containing `:` are cross-cluster. Name the remote cluster explicitly and never',
    '  run `_resolve/cluster`, `_cat/indices` or a search against a wildcard cluster name; with',
    '  many remotes those calls do not return.',
    '- Use `_count` and ES|QL `STATS` for totals; fetch raw documents only with a small `LIMIT`.',
    '',
    '```bash',
    '# connector_id must be set on every one of these commands',
    `curl -s --max-time 120 ${curlAuth} \\`,
    '  -H "Content-Type: application/json" \\',
    '  "$CONNECTOR_CONFIG_URL/logs-*/_count"',
    '',
    `curl -s --max-time 120 ${curlAuth} \\`,
    '  -H "Content-Type: application/json" \\',
    '  "$CONNECTOR_CONFIG_URL/_query" \\',
    '  -d \'{"query":"FROM logs-* | WHERE @timestamp >= \\"2026-01-01T00:00:00Z\\" AND @timestamp < \\"2026-01-01T01:00:00Z\\" | STATS count = COUNT(*) BY service.name | SORT count DESC | LIMIT 20"}\'',
    '```',
    '',
  ].join('\n');
};

export const writeElasticManifest = async ({
  conversationId,
  apiClient,
  connectorId,
  auth,
  readableIndices,
  logger,
}: {
  conversationId: string;
  apiClient: SandboxApiClient;
  connectorId: string;
  auth?: ElasticManifestAuth;
  readableIndices?: string;
  logger: Logger;
}): Promise<void> => {
  logger.debug(`Writing Elasticsearch manifest for conversation ${conversationId}`);

  await apiClient.writeFiles(conversationId, [
    {
      path: '/workspace/elastic.md',
      content: Buffer.from(renderElasticManifest(connectorId, auth, { readableIndices }), 'utf8'),
    },
  ]);
};
