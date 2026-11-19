/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import Fs from 'fs/promises';
import Os from 'os';
import type { ToolingLog } from '@kbn/tooling-log';
import { createArtifact } from './create_artifact';

const createLog = (): ToolingLog =>
  ({
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warning: jest.fn(),
  } as unknown as ToolingLog);

describe('createArtifact', () => {
  let buildFolder: string;
  let targetFolder: string;

  beforeEach(async () => {
    buildFolder = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'security-labs-build-'));
    targetFolder = await Fs.mkdtemp(Path.join(Os.tmpdir(), 'security-labs-target-'));
    await Fs.writeFile(Path.join(buildFolder, 'content-1.ndjson'), '{"title":"test"}\n');
  });

  afterEach(async () => {
    await Fs.rm(buildFolder, { recursive: true, force: true });
    await Fs.rm(targetFolder, { recursive: true, force: true });
  });

  it('writes the timestamped ELSER artifact and a legacy date-only alias', async () => {
    const log = createLog();

    await createArtifact({
      buildFolder,
      targetFolder,
      version: '2026.07.15-231254',
      log,
    });

    const files = (await Fs.readdir(targetFolder)).sort();
    expect(files).toEqual([
      'index.xml',
      'security-labs-2026.07.15-231254.zip',
      'security-labs-2026.07.15.zip',
    ]);

    const timestamped = await Fs.readFile(
      Path.join(targetFolder, 'security-labs-2026.07.15-231254.zip')
    );
    const legacy = await Fs.readFile(Path.join(targetFolder, 'security-labs-2026.07.15.zip'));
    expect(legacy.equals(timestamped)).toBe(true);

    const indexXml = await Fs.readFile(Path.join(targetFolder, 'index.xml'), 'utf-8');
    expect(indexXml).toContain('<Key>security-labs-2026.07.15-231254.zip</Key>');
    expect(indexXml).toContain('<Key>security-labs-2026.07.15.zip</Key>');
  });

  it('does not write a legacy alias for non-ELSER artifacts', async () => {
    const log = createLog();

    await createArtifact({
      buildFolder,
      targetFolder,
      version: '2026.07.15-231254',
      inferenceId: '.jina-embeddings-v5-text-small',
      log,
    });

    const files = (await Fs.readdir(targetFolder)).sort();
    expect(files).toEqual([
      'index.xml',
      'security-labs-2026.07.15-231254--.jina-embeddings-v5-text-small.zip',
    ]);
  });

  it('does not duplicate when the version is already date-only', async () => {
    const log = createLog();

    await createArtifact({
      buildFolder,
      targetFolder,
      version: '2026.07.15',
      log,
    });

    const files = (await Fs.readdir(targetFolder)).sort();
    expect(files).toEqual(['index.xml', 'security-labs-2026.07.15.zip']);
  });
});
