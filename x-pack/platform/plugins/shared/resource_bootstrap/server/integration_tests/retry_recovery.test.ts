/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A run that fails on its last Task Manager attempt deletes its task. This checks, against a real
 * Elasticsearch, that the next start asks for a run of the same files again and applies them once
 * what blocked them is gone, since nothing else re-arms a bootstrap that has given up.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import pRetry from 'p-retry';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { APPLY_TASK_TYPE } from '../../common';
import {
  DATA_VIEW_TYPE,
  existing,
  setupKibanaServer,
  setupTestServers,
  waitForFinished,
} from './lib';

describe('resource bootstrap after Task Manager gives up', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils | undefined;
  let directory: string;

  jest.setTimeout(15 * 60 * 1000);

  const stopKibana = async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
      kibanaServer = undefined;
    }
  };

  const applyTaskExists = async ({ coreStart }: TestKibanaUtils): Promise<boolean> => {
    const { hits } = await coreStart.elasticsearch.client.asInternalUser.search({
      index: '.kibana_task_manager',
      query: { term: { 'task.taskType': APPLY_TASK_TYPE } },
    });
    return hits.hits.length > 0;
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

  it('applies the unchanged files on the next start once what blocked them is gone', async () => {
    // Another data view already has the declared name, so the declared one is refused. It is
    // created while the plugin is disabled.
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    await kibanaServer.coreStart.savedObjects
      .createInternalRepository()
      .create(DATA_VIEW_TYPE, { title: 'taken-*', name: 'taken-*' }, { id: 'other' });
    await stopKibana();

    Fs.writeFileSync(
      Path.join(directory, 'views.data_view.json'),
      JSON.stringify([{ id: 'mine', title: 'taken-*' }])
    );
    const resourceBootstrap = { enabled: true, path: directory };

    // One attempt, so the first failure is also the last and Task Manager deletes the task.
    ({ kibanaServer } = await setupKibanaServer({
      xpack: { resourceBootstrap: { ...resourceBootstrap, maxAttempts: 1 } },
    }));
    const failed = await waitForFinished(kibanaServer, { accept: ['failed'] });
    expect(failed.errors).toEqual([
      expect.objectContaining({
        kind: 'data_view',
        id: 'mine',
        message: expect.stringMatching(/already used/),
      }),
    ]);
    expect(await existing(kibanaServer, DATA_VIEW_TYPE, ['mine'])).toEqual([]);

    const { hash } = failed;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    const failedServer = kibanaServer;
    await pRetry(
      async () => {
        if (await applyTaskExists(failedServer)) {
          throw new Error('Task Manager kept the task after its last attempt');
        }
      },
      { retries: 59, factor: 1, minTimeout: 1000, maxTimeout: 1000 }
    );

    // Only the clashing data view goes away, so the files and their hash stay the same.
    await kibanaServer.coreStart.savedObjects
      .createInternalRepository()
      .delete(DATA_VIEW_TYPE, 'other');
    await stopKibana();

    ({ kibanaServer } = await setupKibanaServer({ xpack: { resourceBootstrap } }));
    const recovered = await waitForFinished(kibanaServer, { accept: ['completed'] });

    expect(recovered).toMatchObject({ hash, status: 'completed', errors: [] });
    expect(await existing(kibanaServer, DATA_VIEW_TYPE, ['mine'])).toEqual(['mine']);
  });
});
