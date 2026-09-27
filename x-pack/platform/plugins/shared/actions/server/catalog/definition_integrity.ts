/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definitionDocId } from './catalog_storage';
import { getContentHash } from './icon';
import type { CatalogManifestRow, StoredDefinition } from './types';

export const expectedDefinitionContentHash = (
  definition: Pick<StoredDefinition, 'id' | 'version' | 'contentHash'>,
  manifestRows?: ReadonlyArray<Pick<CatalogManifestRow, 'id' | 'version' | 'contentHash'>>
): string => {
  const row = manifestRows?.find(
    (candidate) => candidate.id === definition.id && candidate.version === definition.version
  );
  return row?.contentHash ?? definition.contentHash;
};

export const definitionIntegrityErrorMessage = (
  definition: Pick<StoredDefinition, 'id' | 'version'>,
  expectedHash: string,
  actualHash: string
): string =>
  `Stored definition ${definitionDocId(
    definition.id,
    definition.version
  )} failed integrity check: expected ${expectedHash}, computed ${actualHash}`;

export const assertDefinitionYamlHash = (
  definition: Pick<StoredDefinition, 'id' | 'version' | 'yaml' | 'contentHash'>,
  manifestRows?: ReadonlyArray<Pick<CatalogManifestRow, 'id' | 'version' | 'contentHash'>>
): void => {
  const expectedHash = expectedDefinitionContentHash(definition, manifestRows);
  const actualHash = getContentHash(definition.yaml);
  if (actualHash !== expectedHash) {
    throw new Error(definitionIntegrityErrorMessage(definition, expectedHash, actualHash));
  }
};
