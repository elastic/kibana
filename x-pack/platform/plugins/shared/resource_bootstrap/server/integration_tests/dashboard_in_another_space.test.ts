/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Dashboard ids are unique across spaces, but a dashboard can only be looked up in one space at a
 * time, so one declared in a space while it already exists in another looks missing there. This
 * checks, against a real Elasticsearch, that when the bootstrap did not create it, its create fails
 * naming the space it is in, the run is not retried for it, and the bootstrap does not own it; and
 * that when the bootstrap owns it, it is deleted where it was and created where it is declared.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { existing, readLedger, setupKibanaServer, setupTestServers, waitForFinished } from './lib';

describe('resource bootstrap with a dashboard that exists in another space', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils | undefined;
  let directory: string;

  jest.setTimeout(10 * 60 * 1000);

  const stopKibana = async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
      kibanaServer = undefined;
    }
  };

  beforeAll(() => {
    directory = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'resource-bootstrap-'));
  });

  afterAll(async () => {
    await stopKibana();
    if (esServer) {
      await esServer.stop();
    }
    Fs.rmSync(directory, { recursive: true, force: true });
  });

  it('fails naming the space it is in, without owning or changing it', async () => {
    // Someone else made this dashboard in another space. The plugin is disabled.
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    // A lookup in every space covers the spaces that exist, so this one must.
    await kibanaServer.coreStart.savedObjects
      .createInternalRepository(['space'])
      .create('space', { name: 'Elsewhere', disabledFeatures: [] }, { id: 'elsewhere' });
    await kibanaServer.coreStart.savedObjects
      .createInternalRepository()
      .create(
        'dashboard',
        { title: 'Theirs', kibanaSavedObjectMeta: {} },
        { id: 'overview', namespace: 'elsewhere' }
      );
    await stopKibana();

    Fs.writeFileSync(
      Path.join(directory, 'overview.dashboard.json'),
      JSON.stringify({ id: 'overview', title: 'Overview' })
    );
    ({ kibanaServer } = await setupKibanaServer({
      xpack: { resourceBootstrap: { enabled: true, path: directory } },
    }));
    const failed = await waitForFinished(kibanaServer, { accept: ['failed'] });

    expect(failed.errors).toEqual([
      {
        kind: 'dashboard',
        spaceId: 'default',
        id: 'overview',
        message:
          'The dashboard "overview" already exists in the space "elsewhere", and dashboard ids are unique across spaces. Delete it there, or declare it in "default" with another id',
      },
    ]);
    expect(await existing(kibanaServer, 'dashboard', ['overview'], 'elsewhere')).toEqual([
      'overview',
    ]);
    expect(await existing(kibanaServer, 'dashboard', ['overview'])).toEqual([]);
    // The entry written before the create is given up, since nothing was created.
    expect(await readLedger(kibanaServer)).toEqual([]);
  });

  it('moves a dashboard it owns to the space its declaration moved to', async () => {
    // Continues on the Elasticsearch of the test above, with its space "elsewhere".
    const mount = (name: string, document: Record<string, unknown>): string => {
      const path = Path.join(directory, name);
      Fs.mkdirSync(path);
      Fs.writeFileSync(Path.join(path, 'moved.dashboard.json'), JSON.stringify(document));
      return path;
    };
    await stopKibana();

    const before = mount('before', { id: 'moved', title: 'Moved' });
    ({ kibanaServer } = await setupKibanaServer({
      xpack: { resourceBootstrap: { enabled: true, path: before } },
    }));
    const created = await waitForFinished(kibanaServer, { accept: ['completed'] });
    expect(await existing(kibanaServer, 'dashboard', ['moved'])).toEqual(['moved']);
    await stopKibana();

    const after = mount('after', { id: 'moved', title: 'Moved', spaces: ['elsewhere'] });
    ({ kibanaServer } = await setupKibanaServer({
      xpack: { resourceBootstrap: { enabled: true, path: after } },
    }));
    expect(await waitForFinished(kibanaServer, { previousHash: created.hash })).toMatchObject({
      status: 'completed',
    });

    expect(await existing(kibanaServer, 'dashboard', ['moved'])).toEqual([]);
    expect(await existing(kibanaServer, 'dashboard', ['moved'], 'elsewhere')).toEqual(['moved']);
    expect(await readLedger(kibanaServer)).toEqual([
      { kind: 'dashboard', id: 'moved', spaces: ['elsewhere'] },
    ]);
  });
});
