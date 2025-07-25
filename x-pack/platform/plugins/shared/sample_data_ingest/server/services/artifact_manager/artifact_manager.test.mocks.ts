/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const fetchArtifactVersionsMock = jest.fn();
export const validateArtifactArchiveMock = jest.fn();
export const downloadMock = jest.fn();
export const openZipArchiveMock = jest.fn();
export const loadMappingFileMock = jest.fn();
export const loadManifestFileMock = jest.fn();
export const unlinkMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
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

export const majorMinorMock = jest.fn();
export const latestVersionMock = jest.fn();

jest.doMock('./utils/semver', () => {
  const actual = jest.requireActual('./utils/semver');
  return {
    ...actual,
    majorMinor: majorMinorMock,
    latestVersion: latestVersionMock,
  };
});

jest.doMock('fs/promises', () => ({
  unlink: unlinkMock,
}));
