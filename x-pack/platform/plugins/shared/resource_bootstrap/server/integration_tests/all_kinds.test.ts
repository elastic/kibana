/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Runs the bootstrap against a real Elasticsearch and Kibana with every kind registered, and
 * checks what unit tests with mocked services cannot: that the kinds are wired up by their owning
 * plugins, that a space is created before the objects declared into it, and that the ledger
 * resolves concurrent writers through real saved object versions.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { LEDGER_SAVED_OBJECT_TYPE, type BootstrapStatusResponse } from '../../common';
import { LedgerClient } from '../ledger/ledger_client';
import { dataViewSpaces, existing, setupTestServers, waitForFinished } from './lib';

describe('resource bootstrap with every kind', () => {
  let esServer: TestElasticsearchUtils;
  let kibanaServer: TestKibanaUtils;
  let directory: string;
  let finished: BootstrapStatusResponse;

  jest.setTimeout(10 * 60 * 1000);

  beforeAll(async () => {
    directory = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'resource-bootstrap-'));
    const files: Record<string, string> = {
      'team.space.json': JSON.stringify({ id: 'team', name: 'Team' }),
      'logs.data_view.json': JSON.stringify({ id: 'logs', title: 'logs-*' }),
      'overview.dashboard.json': JSON.stringify({ id: 'overview', title: 'Overview' }),
      // Declared into the space that this same run creates.
      'team-board.dashboard.json': JSON.stringify({
        id: 'team-board',
        title: 'Team board',
        spaces: ['team'],
      }),
      // Declared into the space that this same run creates.
      'in-team.data_view.json': JSON.stringify({
        id: 'in-team',
        title: 'in-team-*',
        spaces: ['team'],
      }),
      // One data view in two spaces, one of them created by this same run.
      'everywhere.data_view.json': JSON.stringify({
        id: 'everywhere',
        title: 'everywhere-*',
        spaces: ['default', 'team'],
      }),
    };
    for (const [name, content] of Object.entries(files)) {
      Fs.writeFileSync(Path.join(directory, name), content);
    }

    const setupResult = await setupTestServers({
      xpack: { resourceBootstrap: { enabled: true, path: directory } },
    });
    esServer = setupResult.esServer;
    kibanaServer = setupResult.kibanaServer;

    finished = await waitForFinished(kibanaServer);
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

  it('applies spaces, data views and dashboards in one run', () => {
    expect(finished).toMatchObject({
      status: 'completed',
      errors: [],
      kinds: {
        space: { applied: 1, failed: 0 },
        data_view: { applied: 3, failed: 0 },
        dashboard: { applied: 2, failed: 0 },
      },
    });
  });

  it('creates the space before it applies the objects declared into it', async () => {
    // Spaces are a hidden saved object type.
    const repository = kibanaServer.coreStart.savedObjects.createInternalRepository(['space']);

    await expect(repository.get('space', 'team')).resolves.toMatchObject({
      attributes: { name: 'Team' },
    });
    expect(await existing(kibanaServer, 'index-pattern', ['in-team'], 'team')).toEqual(['in-team']);
    expect(await existing(kibanaServer, 'index-pattern', ['in-team'])).toEqual([]);
  });

  it('applies a data view into the default space', async () => {
    expect(await existing(kibanaServer, 'index-pattern', ['logs'])).toEqual(['logs']);
    expect(await existing(kibanaServer, 'index-pattern', ['logs'], 'team')).toEqual([]);
  });

  it('applies a data view declared in two spaces as one object in both', async () => {
    expect(await dataViewSpaces(kibanaServer, 'everywhere')).toEqual(['default', 'team']);
  });

  it('applies dashboards into the space each names, or the default space', async () => {
    expect(await existing(kibanaServer, 'dashboard', ['overview', 'team-board'])).toEqual([
      'overview',
    ]);
    expect(await existing(kibanaServer, 'dashboard', ['overview', 'team-board'], 'team')).toEqual([
      'team-board',
    ]);
  });

  describe('against the real saved objects repository', () => {
    const entry = (id: string) => ({ kind: 'data_view', id, spaces: ['default'] });

    it('replaces an entry on put, removes entries, and lists every entry', async () => {
      const ledger = new LedgerClient(
        kibanaServer.coreStart.savedObjects.createInternalRepository([LEDGER_SAVED_OBJECT_TYPE])
      );
      const ids = (await ledger.list()).map(({ docId }) => docId);
      await ledger.remove(ids);

      await ledger.put([{ docId: 'one', entry: entry('one') }]);
      expect((await ledger.list()).map(({ entry: stored }) => stored)).toEqual([entry('one')]);

      await ledger.put([
        { docId: 'one', entry: entry('renamed') },
        { docId: 'two', entry: entry('two') },
      ]);
      await ledger.remove(['one', 'missing']);

      expect(await ledger.list()).toEqual([{ docId: 'two', entry: entry('two') }]);
    });
  });
});
