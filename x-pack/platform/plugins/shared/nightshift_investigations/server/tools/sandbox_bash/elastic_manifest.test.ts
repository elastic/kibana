/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { SandboxApiClient } from './grpc_client';
import { renderElasticManifest, writeElasticManifest } from './elastic_manifest';

describe('renderElasticManifest', () => {
  it('documents basic auth without embedding credentials', () => {
    const content = renderElasticManifest('scout-telemetry', 'basic');

    expect(content).toContain('`CONNECTOR_SECRET_USER`');
    expect(content).toContain('`CONNECTOR_SECRET_PASSWORD`');
    expect(content).toContain('-u "$CONNECTOR_SECRET_USER:$CONNECTOR_SECRET_PASSWORD"');
    expect(content).not.toContain('Authorization: ApiKey');
  });

  it('tells the agent which connector id unlocks the credentials', () => {
    const content = renderElasticManifest('elasticsearch-telemetry');

    expect(content).toContain('`connector_id: "elasticsearch-telemetry"`');
    expect(content).toContain('`CONNECTOR_CONFIG_URL`');
    expect(content).toContain('`CONNECTOR_SECRET_PASSWORD`');
    expect(content).toContain('never hard-code their values');
  });

  it('documents the readable indices and a query example', () => {
    const content = renderElasticManifest('elasticsearch-telemetry');

    expect(content).toContain('`logs-*`, `metrics-*`, `traces-*`');
    expect(content).toContain('"$CONNECTOR_CONFIG_URL/_query"');
    expect(content).toContain('`@timestamp` range to every query');
  });

  it('documents a preconfigured Authorization header without embedding it', () => {
    const content = renderElasticManifest('remote-telemetry', 'header');

    expect(content).toContain('-H "Authorization: $CONNECTOR_SECRET_HEADER_AUTHORIZATION"');
    expect(content).not.toContain('CONNECTOR_SECRET_PASSWORD');
    expect(content).not.toContain('ApiKey $');
  });

  it('replaces the readable-index hint with the configured guidance', () => {
    const content = renderElasticManifest('remote-telemetry', 'header', {
      readableIndices: 'Readable remotes: `logging-azure-eastus2:logs-*`.\n',
    });

    expect(content).toContain('Readable remotes: `logging-azure-eastus2:logs-*`.');
    expect(content).not.toContain('`logs-*`, `metrics-*`, `traces-*`');
  });
});

describe('writeElasticManifest', () => {
  it('writes the manifest to /workspace/elastic.md', async () => {
    const writeFiles = jest.fn().mockResolvedValue(undefined);
    const apiClient = { writeFiles } as unknown as SandboxApiClient;

    await writeElasticManifest({
      conversationId: 'conversation-1',
      apiClient,
      connectorId: 'elasticsearch-telemetry',
      logger: loggingSystemMock.createLogger(),
    });

    expect(writeFiles).toHaveBeenCalledWith('conversation-1', [
      { path: '/workspace/elastic.md', content: expect.any(Buffer) },
    ]);
    const [, files] = writeFiles.mock.calls[0];
    expect(files[0].content.toString('utf8')).toContain('# Elasticsearch telemetry');
  });
});
