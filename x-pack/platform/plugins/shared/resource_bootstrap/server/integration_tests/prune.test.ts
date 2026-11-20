/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Pruning deletes data, so this runs it against a real Elasticsearch and checks that the bootstrap
 * never takes over an object it did not create, that it takes a data view shared by hand back to
 * the spaces its files name, and that it deletes what it owns once it leaves the files, edited by
 * hand or not. Each phase restarts Kibana on the same Elasticsearch with different files and
 * settings.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import {
  DATA_VIEW_TYPE as TYPE,
  dataViewSpaces,
  dataViewsJson,
  existing,
  readLedger,
  setupKibanaServer,
  setupTestServers,
  waitForFinished,
} from './lib';

const owned = (ids: string[], spaces = ['default']) =>
  ids.map((id) => ({ kind: 'data_view', id, spaces }));

describe('resource bootstrap ownership and pruning', () => {
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

  /** Each phase mounts different files, so each one has a hash and a task of its own. */
  const mount = (name: string, files: Record<string, string>): string => {
    const path = Path.join(directory, name);
    Fs.mkdirSync(path);
    for (const [file, content] of Object.entries(files)) {
      Fs.writeFileSync(Path.join(path, file), content);
    }
    return path;
  };

  const shareByHand = async ({ coreStart }: TestKibanaUtils, id: string) => {
    await coreStart.savedObjects
      .createInternalRepository()
      .updateObjectsSpaces([{ type: TYPE, id }], ['other'], []);
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

  it('owns only what it created, reverts drift, and prunes what it owns once it leaves the files', async () => {
    // Someone else made this data view before the bootstrap declares it. The plugin is disabled.
    const setupResult = await setupTestServers();
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;
    await kibanaServer.coreStart.savedObjects
      .createInternalRepository()
      .create(TYPE, { title: 'mine-*' }, { id: 'user' });
    await stopKibana();

    // The bootstrap creates and owns what did not exist, and refuses `user` without touching it.
    const one = mount('one', { 'views.data_view.json': dataViewsJson(['a', 'b', 'c', 'user']) });
    const first = await startKibana({ enabled: true, path: one });
    const refused = await waitForFinished(first, { accept: ['failed'] });
    expect(refused.errors).toEqual([
      expect.objectContaining({
        kind: 'data_view',
        id: 'user',
        message: expect.stringContaining('the bootstrap did not create it'),
      }),
    ]);
    expect(await existing(first, TYPE, ['a', 'b', 'c', 'user'])).toEqual(['a', 'b', 'c', 'user']);
    const { attributes } = await first.coreStart.savedObjects
      .createInternalRepository()
      .get<{ title: string }>(TYPE, 'user');
    expect(attributes.title).toBe('mine-*');
    expect(await readLedger(first)).toEqual(owned(['a', 'b', 'c']));
    await shareByHand(first, 'b');
    await stopKibana();

    // Sharing `b` by hand is drift: the next run takes it back to the space its file names.
    const two = mount('two', { 'views.data_view.json': dataViewsJson(['a', 'b', 'c']) });
    const second = await startKibana({ enabled: true, path: two });
    const aligned = await waitForFinished(second, { previousHash: refused.hash });
    expect(aligned).toMatchObject({ status: 'completed' });
    expect(await dataViewSpaces(second, 'b')).toEqual(['default']);
    // Changed by hand again, which does not stop the bootstrap from owning it.
    await shareByHand(second, 'b');
    await stopKibana();

    // `b` left the files, so it is deleted even though it was edited by hand, and `c` moved to a
    // space it is not in yet, so it is moved rather than deleted. `user` was never owned.
    const three = mount('three', {
      'views.data_view.json': dataViewsJson(['a']),
      'moved.data_view.json': dataViewsJson(['c'], ['team']),
    });
    const pruning = await startKibana({ enabled: true, path: three, prune: true });
    expect(await waitForFinished(pruning, { previousHash: aligned.hash })).toMatchObject({
      status: 'completed',
      kinds: { data_view: { pruned: 1 } },
    });
    expect(await dataViewSpaces(pruning, 'b')).toEqual([]);
    expect(await dataViewSpaces(pruning, 'c')).toEqual(['team']);
    expect(await existing(pruning, TYPE, ['a', 'user'])).toEqual(['a', 'user']);
    expect(await readLedger(pruning)).toEqual([...owned(['a']), ...owned(['c'], ['team'])]);
  });
});
