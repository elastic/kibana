/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Os from 'os';
import Path from 'path';
import { pathToFileURL } from 'url';
import { loggerMock, type MockedLogger } from '@kbn/logging-mocks';
import { resolveArtifactRepositoryUrl } from './artifact_repository';
import { DEFAULT_ARTIFACT_REPOSITORY_URL } from './config';
import {
  fetchArtifactVersions,
  fetchLocalRepositoryVersion,
} from './services/package_installer/steps/fetch_artifact_versions';
import { checkArtifactAvailable } from './services/package_installer/utils/download';

const REMOTE_URL = DEFAULT_ARTIFACT_REPOSITORY_URL;

describe('resolveArtifactRepositoryUrl', () => {
  let logger: MockedLogger;
  let bundledArtifactsPath: string;

  beforeEach(() => {
    logger = loggerMock.create();
    bundledArtifactsPath = Fs.mkdtempSync(Path.join(Os.tmpdir(), 'product-doc-bundled-'));
  });

  afterEach(() => {
    Fs.rmSync(bundledArtifactsPath, { recursive: true, force: true });
  });

  const resolve = (
    isServerless: boolean,
    useBundledArtifacts = true,
    artifactRepositoryUrl = REMOTE_URL
  ) =>
    resolveArtifactRepositoryUrl({
      config: { artifactRepositoryUrl, useBundledArtifacts },
      isServerless,
      logger,
      bundledArtifactsPath,
    });

  it('uses the bundled artifacts on serverless when they exist', () => {
    Fs.writeFileSync(Path.join(bundledArtifactsPath, 'index.xml'), '<ListBucketResult />');

    expect(resolve(true)).toBe(pathToFileURL(bundledArtifactsPath).href);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('Using bundled product documentation artifacts')
    );
  });

  it('falls back to the remote repository on serverless when no bundle is present', () => {
    expect(resolve(true)).toBe(REMOTE_URL);
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('No bundled product documentation artifacts')
    );
  });

  it('uses the remote repository on serverless when bundled artifacts are disabled', () => {
    Fs.writeFileSync(Path.join(bundledArtifactsPath, 'index.xml'), '<ListBucketResult />');

    expect(resolve(true, false)).toBe(REMOTE_URL);
  });

  it('uses a non-default repository URL on serverless even when a bundle exists', () => {
    Fs.writeFileSync(Path.join(bundledArtifactsPath, 'index.xml'), '<ListBucketResult />');

    expect(resolve(true, true, 'file:///custom/stub')).toBe('file:///custom/stub');
  });

  it('yields a repository URL the installer can read back from a path with spaces and percent signs', async () => {
    const spacedPath = Path.join(bundledArtifactsPath, 'Kibana Test%20dir');
    const key = 'kb-product-doc-kibana-latest--.jina-embeddings-v5-text-small.zip';
    Fs.mkdirSync(spacedPath);
    Fs.writeFileSync(Path.join(spacedPath, key), 'zip');
    Fs.writeFileSync(
      Path.join(spacedPath, 'index.xml'),
      `<ListBucketResult><Contents><Key>${key}</Key><LastModified>2026-10-12T20:25:34.000Z</LastModified></Contents></ListBucketResult>`
    );

    const artifactRepositoryUrl = resolveArtifactRepositoryUrl({
      config: { artifactRepositoryUrl: REMOTE_URL, useBundledArtifacts: true },
      isServerless: true,
      logger,
      bundledArtifactsPath: spacedPath,
    });

    expect(artifactRepositoryUrl).toContain('Kibana%20Test%2520dir');
    await expect(
      fetchArtifactVersions({
        artifactRepositoryUrl,
        inferenceId: '.jina-embeddings-v5-text-small',
      })
    ).resolves.toMatchObject({
      versions: { kibana: ['latest-2026-10-12T20:25:34.000Z'] },
    });
    await expect(fetchLocalRepositoryVersion({ artifactRepositoryUrl })).resolves.toBe(
      '2026-10-12T20:25:34.000Z'
    );
    await expect(
      checkArtifactAvailable(`${artifactRepositoryUrl}/${key}`)
    ).resolves.toBeUndefined();
  });

  it('uses the remote repository outside serverless even when a bundle exists', () => {
    Fs.writeFileSync(Path.join(bundledArtifactsPath, 'index.xml'), '<ListBucketResult />');

    expect(resolve(false)).toBe(REMOTE_URL);
    expect(logger.info).toHaveBeenCalledWith(
      `Using product documentation artifact repository [${REMOTE_URL}]`
    );
  });
});
