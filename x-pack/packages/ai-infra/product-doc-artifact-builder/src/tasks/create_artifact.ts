/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import AdmZip from 'adm-zip';
import type { ToolingLog } from '@kbn/tooling-log';
import {
  LATEST_MANIFEST_FORMAT_VERSION,
  getArtifactName,
  type ProductName,
} from '@kbn/product-doc-common';
import { getArtifactMappings } from '../artifact/mappings';
import { getArtifactManifest } from '../artifact/manifest';
import { DEFAULT_ELSER, SemanticTextMapping } from './create_index';

export const createArtifact = async ({
  productName,
  stackVersion,
  buildFolder,
  targetFolder,
  log,
  semanticTextMapping,
}: {
  buildFolder: string;
  targetFolder: string;
  productName: ProductName;
  stackVersion: string;
  log: ToolingLog;
  semanticTextMapping?: SemanticTextMapping;
}) => {
  log.info(
    `Starting to create artifact from build folder [${buildFolder}] into target [${targetFolder}]`
  );

  const zip = new AdmZip();

  const inferenceId = semanticTextMapping?.inference_id || DEFAULT_ELSER;

  const mappings = getArtifactMappings(semanticTextMapping);
  const mappingFileContent = JSON.stringify(mappings, undefined, 2);
  zip.addFile('mappings.json', Buffer.from(mappingFileContent, 'utf-8'));

  const manifest = getArtifactManifest({
    productName,
    stackVersion,
    formatVersion: LATEST_MANIFEST_FORMAT_VERSION,
  });
  const manifestFileContent = JSON.stringify(manifest, undefined, 2);
  zip.addFile('manifest.json', Buffer.from(manifestFileContent, 'utf-8'));

  zip.addLocalFolder(buildFolder, 'content');

  const artifactName = getArtifactName({
    productName,
    productVersion: stackVersion,
    inferenceId,
  });
  zip.writeZip(Path.join(targetFolder, artifactName));

  log.info(`Finished creating artifact [${artifactName}]`);
};
