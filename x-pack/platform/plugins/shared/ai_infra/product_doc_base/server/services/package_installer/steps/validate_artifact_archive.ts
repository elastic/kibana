/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isArtifactContentFilePath } from '@kbn/product-doc-common';
import type { ZipArchive } from '../utils/zip_archive';

type ValidationResult = { valid: true } | { valid: false; error: string };

export const validateArtifactArchive = (archive: ZipArchive): ValidationResult => {
  if (!archive.hasEntry('manifest.json')) {
    return { valid: false, error: 'Manifest file not found' };
  }
  if (!archive.hasEntry('mappings.json')) {
    return { valid: false, error: 'Mapping file not found' };
  }
  if (!archive.getEntryPaths().some(isArtifactContentFilePath)) {
    return { valid: false, error: 'No content files were found' };
  }
  return { valid: true };
};
