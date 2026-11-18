/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * With security enabled, the spaces extension of a saved objects client checks the spaces a lookup
 * names against the user of its request, and the bootstrap has none. The test Elasticsearch URL
 * carries superuser credentials, which the client sends with every request, even one scoped to a
 * request without credentials, so the other integration tests cannot see that. This one connects
 * without them, as a deployment does, so Kibana authenticates only as its own user.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import Url from 'url';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { esTestConfig } from '@kbn/test';
import { dataViewSpaces, existing, setupTestServers, waitForFinished } from './lib';

describe('resource bootstrap with a request without credentials', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let directory: string;

  jest.setTimeout(10 * 60 * 1000);

  beforeAll(async () => {
    directory = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'resource-bootstrap-'));
    const files: Record<string, string> = {
      'team.space.json': JSON.stringify({ id: 'team', name: 'Team' }),
      // One data view in two spaces: it is looked up, and its name checked, across both.
      'shared.data_view.json': JSON.stringify({
        id: 'shared',
        title: 'shared-*',
        spaces: ['default', 'team'],
      }),
      'board.dashboard.json': JSON.stringify({ id: 'board', title: 'Board', spaces: ['team'] }),
    };
    for (const [name, content] of Object.entries(files)) {
      Fs.writeFileSync(Path.join(directory, name), content);
    }

    const { protocol, hostname, port } = esTestConfig.getUrlParts();
    const setupResult = await setupTestServers({
      elasticsearch: { hosts: [Url.format({ protocol, hostname, port })] },
      xpack: {
        resourceBootstrap: { enabled: true, path: directory },
        // Its setup outlasts this short test and logs once Elasticsearch has stopped.
        streams: { preconfigured: { enabled: false } },
      },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
  });

  afterAll(async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
    }
    if (esServer) {
      await esServer.stop();
    }
    Fs.rmSync(directory, { recursive: true, force: true });
  });

  it('applies and owns every kind without a user request', async () => {
    const finished = await waitForFinished(kibanaServer);

    expect(finished).toMatchObject({
      status: 'completed',
      errors: [],
      kinds: {
        space: { applied: 1, created: 1, failed: 0 },
        data_view: { applied: 1, created: 1, failed: 0 },
        dashboard: { applied: 1, created: 1, failed: 0 },
      },
    });
    expect(await dataViewSpaces(kibanaServer, 'shared')).toEqual(['default', 'team']);
    expect(await existing(kibanaServer, 'dashboard', ['board'], 'team')).toEqual(['board']);
  });
});
