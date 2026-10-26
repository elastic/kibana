/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spawnSync } from 'child_process';
import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { FlagsReader, getFlags } from '@kbn/dev-cli-runner';
import type { RunContext } from '@kbn/dev-cli-runner';
import { ToolingLog } from '@kbn/tooling-log';
import { dataplexCmd } from './dataplex';

jest.mock('child_process', () => ({
  spawnSync: jest.fn(),
}));

const mockedSpawnSync = jest.mocked(spawnSync);
const entryId = 'test-entry';
const project = 'test-project';
const location = 'test-location';
const entryGroup = 'test-entry-group';

const result = (status: number, stderr = '', stdout = '') => ({
  status,
  stderr,
  stdout,
  pid: 1,
  output: [null, stdout, stderr],
  signal: null,
});

describe('dataplexCmd sync', () => {
  let cwd: string;
  let tmpDir: string;
  let logMessages: string[];

  beforeEach(() => {
    cwd = process.cwd();
    tmpDir = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'dataplex-command-test-'));
    const aspectsDir = Path.join(
      tmpDir,
      'x-pack/platform/packages/shared/kbn-evals/snapshots/dataplex'
    );
    Fs.mkdirSync(aspectsDir, { recursive: true });
    Fs.writeFileSync(
      Path.join(aspectsDir, `${entryId}.yaml`),
      `es_snapshot_metadata:
  data:
    gcs_path: gs://test-bucket/test-path
    description: Test entry
`
    );
    process.chdir(tmpDir);
    logMessages = [];
    mockedSpawnSync.mockReset();
  });

  afterEach(() => {
    process.chdir(cwd);
    Fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const runCommand = async () => {
    const flagsReader = new FlagsReader(
      getFlags(
        [
          'sync',
          entryId,
          '--project',
          project,
          '--location',
          location,
          '--entry-group',
          entryGroup,
        ],
        dataplexCmd.flags
      )
    );
    const log = new ToolingLog({ level: 'silent', writeTo: { write: () => {} } });
    jest.spyOn(log, 'info').mockImplementation((message) => {
      logMessages.push(message);
    });

    await dataplexCmd.run({ log, flagsReader } as RunContext);
  };

  const gcloudCalls = () => mockedSpawnSync.mock.calls.map(([, args]) => args as readonly string[]);

  it('describes an existing entry by positional ID and entry group, then updates it', async () => {
    mockedSpawnSync
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(result(0));

    await runCommand();

    expect(gcloudCalls()[1]).toEqual([
      'dataplex',
      'entries',
      'describe',
      entryId,
      '--project',
      project,
      '--location',
      location,
      '--entry-group',
      entryGroup,
      '--view',
      'BASIC',
    ]);
    expect(gcloudCalls()[2]).toEqual(
      expect.arrayContaining(['dataplex', 'entries', 'update', entryId])
    );
    expect(gcloudCalls()).not.toEqual(
      expect.arrayContaining([expect.arrayContaining(['dataplex', 'entries', 'create', entryId])])
    );
    expect(logMessages).toContain(`Updated: ${entryId}`);
  });

  it.each([
    ['NOT_FOUND', 'ERROR: (gcloud.dataplex.entries.describe) NOT_FOUND: Entry was not found'],
    ['status 404', 'ERROR: (gcloud.dataplex.entries.describe) Status code: 404'],
  ])('creates after a confirmed %s describe response', async (_label, diagnostic) => {
    mockedSpawnSync
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(result(1, diagnostic))
      .mockReturnValueOnce(result(0));

    await runCommand();

    expect(gcloudCalls()[2]).toEqual(
      expect.arrayContaining(['dataplex', 'entries', 'create', entryId])
    );
    expect(gcloudCalls()).not.toEqual(
      expect.arrayContaining([expect.arrayContaining(['dataplex', 'entries', 'update', entryId])])
    );
    expect(logMessages).toContain(`Created: ${entryId}`);
  });

  it('preserves other describe failures and performs no write', async () => {
    const diagnostic = 'ERROR: (gcloud.dataplex.entries.describe) UNAVAILABLE: backend unavailable';
    mockedSpawnSync.mockReturnValueOnce(result(0)).mockReturnValueOnce(result(1, diagnostic));

    await expect(runCommand()).rejects.toThrow(diagnostic);

    expect(gcloudCalls()).toHaveLength(2);
  });

  it('does not classify a write failure as permission denied from the command name alone', async () => {
    const diagnostic =
      'ERROR: (gcloud.dataplex.entries.create) INVALID_ARGUMENT: malformed aspect payload';
    mockedSpawnSync
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(
        result(1, 'ERROR: (gcloud.dataplex.entries.describe) NOT_FOUND: Entry was not found')
      )
      .mockReturnValueOnce(result(1, diagnostic));

    await expect(runCommand()).rejects.toThrow(`Failed to create entry ${entryId}: ${diagnostic}`);
  });

  it('classifies a confirmed PERMISSION_DENIED write failure as permission denied', async () => {
    mockedSpawnSync
      .mockReturnValueOnce(result(0))
      .mockReturnValueOnce(
        result(1, 'ERROR: (gcloud.dataplex.entries.describe) NOT_FOUND: Entry was not found')
      )
      .mockReturnValueOnce(
        result(
          1,
          'ERROR: (gcloud.dataplex.entries.create) PERMISSION_DENIED: caller lacks permission'
        )
      );

    await expect(runCommand()).rejects.toThrow(
      `Permission denied creating Dataplex entry "${entryId}".`
    );
  });
});
