/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

export const validateArtifactArchiveMock = vi.fn();
export const validateOpenApiArtifactArchiveMock = vi.fn();
export const fetchArtifactVersionsMock = vi.fn();
export const fetchSecurityLabsVersionsMock = vi.fn();
export const createIndexMock = vi.fn();
export const populateIndexMock = vi.fn();

vi.doMock('./steps', async () => {
  const actual = await vi.importActual('./steps');
  return {
    ...actual,
    validateArtifactArchive: validateArtifactArchiveMock,
    validateOpenApiArtifactArchive: validateOpenApiArtifactArchiveMock,
    fetchArtifactVersions: fetchArtifactVersionsMock,
    fetchSecurityLabsVersions: fetchSecurityLabsVersionsMock,
    createIndex: createIndexMock,
    populateIndex: populateIndexMock,
  };
});

export const downloadToDiskMock = vi.fn();
export const openZipArchiveMock = vi.fn();
export const loadMappingFileMock = vi.fn();
export const loadManifestFileMock = vi.fn();
export const ensureDefaultElserDeployedMock = vi.fn();
export const ensureInferenceDeployedMock = vi.fn();
export const checkArtifactAvailableMock = vi.fn();
export const removeArtifactFileMock = vi.fn();
export const logArtifactsFolderUsageMock = vi.fn();
export const purgeArtifactsFolderMock = vi.fn();

vi.doMock('./utils', async () => {
  const actual = await vi.importActual('./utils');
  return {
    ...actual,
    downloadToDisk: downloadToDiskMock,
    openZipArchive: openZipArchiveMock,
    loadMappingFile: loadMappingFileMock,
    loadManifestFile: loadManifestFileMock,
    ensureDefaultElserDeployed: ensureDefaultElserDeployedMock,
    ensureInferenceDeployed: ensureInferenceDeployedMock,
    checkArtifactAvailable: checkArtifactAvailableMock,
    removeArtifactFile: removeArtifactFileMock,
    logArtifactsFolderUsage: logArtifactsFolderUsageMock,
    purgeArtifactsFolder: purgeArtifactsFolderMock,
  };
});
