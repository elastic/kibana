/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Spaces are owned like every other kind, but never pruned. This checks, against a real
 * Elasticsearch, that a space the bootstrap did not create, such as `default`, is not taken over,
 * that one it created is owned and left as it is on the next start, and that it stays, still
 * owned, once it leaves the files with pruning on.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import pRetry from 'p-retry';
import {
  dataViewsJson,
  readLedger,
  setupKibanaServer,
  setupTestServers,
  waitForFinished,
} from './lib';

describe('resource bootstrap with spaces', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils | undefined;
  let directory: string;

  jest.setTimeout(15 * 60 * 1000);

  const startKibana = async (path: string) => {
    ({ kibanaServer } = await setupKibanaServer({
      xpack: { resourceBootstrap: { enabled: true, path, prune: true } },
    }));
    return kibanaServer;
  };

  const stopKibana = async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
      kibanaServer = undefined;
    }
  };

  /** Writes `files` into a new mount named `name`, and returns its path. */
  const mount = (name: string, files: Record<string, string>): string => {
    const path = Path.join(directory, name);
    Fs.mkdirSync(path);
    for (const [file, content] of Object.entries(files)) {
      Fs.writeFileSync(Path.join(path, file), content);
    }
    return path;
  };

  const getSpaceName = async ({ coreStart }: Pick<TestKibanaUtils, 'coreStart'>, id: string) => {
    // Spaces are a hidden saved object type.
    const { attributes } = await coreStart.savedObjects
      .createInternalRepository(['space'])
      .get<{ name: string }>('space', id);
    return attributes.name;
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

  it('owns the spaces it creates, never takes one over, and never prunes one', async () => {
    // A start without the plugin, so the default space exists before any run. The spaces plugin
    // creates it once Elasticsearch is available, after the start returns.
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    const started = kibanaServer;
    const defaultName = await pRetry(() => getSpaceName(started, 'default'), {
      retries: 59,
      factor: 1,
      minTimeout: 1000,
      maxTimeout: 1000,
    });
    await stopKibana();

    const first = await startKibana(
      mount('first', {
        'spaces.space.json': JSON.stringify([
          { id: 'team', name: 'Team' },
          { id: 'default', name: 'Taken over' },
        ]),
      })
    );
    const failed = await waitForFinished(first, { accept: ['failed'] });

    expect(failed.errors).toEqual([
      {
        kind: 'space',
        id: 'default',
        message:
          'The space "default" already exists and the bootstrap did not create it, so it is not applied. Delete it, or declare it with another id',
      },
    ]);
    expect(failed.kinds.space).toMatchObject({ applied: 1, created: 1, failed: 1 });
    expect(await getSpaceName(first, 'default')).toBe(defaultName);
    expect(await getSpaceName(first, 'team')).toBe('Team');
    expect(await readLedger(first)).toEqual([{ kind: 'space', id: 'team', spaces: [] }]);
    await stopKibana();

    // Unchanged since the bootstrap wrote it, so the next start leaves it as it is.
    const second = await startKibana(
      mount('second', { 'spaces.space.json': JSON.stringify([{ id: 'team', name: 'Team' }]) })
    );
    const unchanged = await waitForFinished(second, { previousHash: failed.hash });

    expect(unchanged).toMatchObject({ status: 'completed', errors: [] });
    expect(unchanged.kinds.space).toMatchObject({ applied: 0, unchanged: 1, failed: 0 });
    await stopKibana();

    // Left out of the files with pruning on, it stays, and stays owned.
    const third = await startKibana(
      mount('third', { 'views.data_view.json': dataViewsJson(['logs']) })
    );
    const pruned = await waitForFinished(third, { previousHash: unchanged.hash });

    expect(pruned).toMatchObject({ status: 'completed', errors: [] });
    expect(await getSpaceName(third, 'team')).toBe('Team');
    expect(await readLedger(third)).toEqual([
      { kind: 'data_view', id: 'logs', spaces: ['default'] },
      { kind: 'space', id: 'team', spaces: [] },
    ]);
  });
});
