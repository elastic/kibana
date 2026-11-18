/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Every start applies the files again, even when they have not changed, so the files stay the
 * source of truth: an edit or a deletion made by hand to a declared resource is undone on the
 * next restart. This runs it against a real Elasticsearch, restarting Kibana on the same files.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  DATA_VIEW_TYPE as TYPE,
  dataViewsJson,
  existing,
  readLedger,
  setupKibanaServer,
  setupTestServers,
  waitForFinished,
} from './lib';

describe('resource bootstrap on a restart with unchanged files', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils | undefined;
  let directory: string;

  jest.setTimeout(15 * 60 * 1000);

  const startKibana = async (resourceBootstrap: Record<string, unknown>) => {
    ({ kibanaServer } = await setupKibanaServer({ xpack: { resourceBootstrap } }));
    return kibanaServer;
  };

  const stopKibana = async () => {
    if (kibanaServer) {
      await kibanaServer.stop();
      kibanaServer = undefined;
    }
  };

  const getTitle = async ({ coreStart }: Pick<TestKibanaUtils, 'coreStart'>, id: string) => {
    const { attributes } = await coreStart.savedObjects
      .createInternalRepository()
      .get<{ title: string }>(TYPE, id);
    return attributes.title;
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

  it('reverts a hand edit and restores a hand deletion without changing what is owned', async () => {
    const path = Path.join(directory, 'files');
    Fs.mkdirSync(path);
    Fs.writeFileSync(Path.join(path, 'views.data_view.json'), dataViewsJson(['a', 'b']));
    const settings = { enabled: true, path };

    const setupResult = await setupTestServers({ xpack: { resourceBootstrap: settings } });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    const first = kibanaServer;
    const applied = await waitForFinished(first);
    expect(applied).toMatchObject({ status: 'completed' });
    const previousFinishedAt = 'finishedAt' in applied ? applied.finishedAt : undefined;
    expect(previousFinishedAt).toBeDefined();
    expect(await getTitle(first, 'a')).toBe('a-*');

    const repository = first.coreStart.savedObjects.createInternalRepository();
    await repository.update(TYPE, 'a', { title: 'edited-*' });
    await repository.delete(TYPE, 'b');
    expect(await getTitle(first, 'a')).toBe('edited-*');
    expect(await existing(first, TYPE, ['a', 'b'])).toEqual(['a']);
    await stopKibana();

    const second = await startKibana(settings);
    const reapplied = await waitForFinished(second, { previousFinishedAt });

    expect(reapplied).toMatchObject({ status: 'completed', hash: applied.hash });
    // The edit changed `a`'s version and `b` was gone, so neither counts as unchanged.
    expect(reapplied.kinds.data_view).toMatchObject({ applied: 2, unchanged: 0 });
    expect(await getTitle(second, 'a')).toBe('a-*');
    expect(await existing(second, TYPE, ['a', 'b'])).toEqual(['a', 'b']);
    expect(await readLedger(second)).toEqual(
      ['a', 'b'].map((id) => ({ kind: 'data_view', id, spaces: ['default'] }))
    );
    const secondFinishedAt = 'finishedAt' in reapplied ? reapplied.finishedAt : undefined;
    await stopKibana();

    // Nothing changed since, so the next start writes nothing.
    const third = await startKibana(settings);
    const planned = await waitForFinished(third, { previousFinishedAt: secondFinishedAt });

    expect(planned).toMatchObject({ status: 'completed' });
    expect(planned.kinds.data_view).toMatchObject({ applied: 0, unchanged: 2, failed: 0 });
  });
});
