/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const fetchArtifactVersionsMock = vi.fn();
export const validateArtifactArchiveMock = vi.fn();
export const downloadMock = vi.fn();
export const openZipArchiveMock = vi.fn();
export const loadMappingFileMock = vi.fn();
export const loadManifestFileMock = vi.fn();
export const deleteFileMock = vi.fn();

vi.doMock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    fetchArtifactVersions: fetchArtifactVersionsMock,
    validateArtifactArchive: validateArtifactArchiveMock,
    download: downloadMock,
    openZipArchive: openZipArchiveMock,
    loadMappingFile: loadMappingFileMock,
    loadManifestFile: loadManifestFileMock,
  };
});

export const majorMinorMock = vi.fn();
export const latestVersionMock = vi.fn();

vi.doMock('./utils/semver', async () => {
  const actual = await vi.importActual('./utils/semver');
  return {
    ...actual,
    majorMinor: majorMinorMock,
    latestVersion: latestVersionMock,
  };
});

vi.doMock('@kbn/fs', () => {
  const mocked = {
    deleteFile: deleteFileMock,
  };
  return { ...mocked, default: mocked };
});
