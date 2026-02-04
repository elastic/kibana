/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import AdmZip from 'adm-zip';
import Fs from 'fs/promises';
import type { ToolingLog } from '@kbn/tooling-log';
import { DocumentationProduct } from '@kbn/product-doc-common';
import { LATEST_MANIFEST_FORMAT_VERSION } from '@kbn/product-doc-common';
import { getArtifactMappings } from '../../artifact/mappings';
import { getArtifactManifest } from '../../artifact/manifest';
import type { SemanticTextMapping } from '../create_index';

export const createCombinedOpenAPIArtifact = async ({
  buildFolder,
  targetFolder,
  stackVersion,
  log,
  semanticTextMapping,
}: {
  buildFolder: string;
  targetFolder: string;
  stackVersion: string;
  log: ToolingLog;
  semanticTextMapping: SemanticTextMapping;
}) => {
  log.info(
    `Starting to create combined OpenAPI artifact from build folder [${buildFolder}] into target [${targetFolder}]`
  );

  const zip = new AdmZip();

  const mappings = getArtifactMappings(semanticTextMapping);
  const mappingFileContent = JSON.stringify(mappings, undefined, 2);

  // Add elasticsearch folder contents
  const esBuildFolder = Path.join(buildFolder, DocumentationProduct.elasticsearch);
  const esManifest = getArtifactManifest({
    productName: DocumentationProduct.elasticsearch,
    stackVersion,
    formatVersion: LATEST_MANIFEST_FORMAT_VERSION,
  });

  zip.addFile(
    `${DocumentationProduct.elasticsearch}/mappings.json`,
    Buffer.from(mappingFileContent, 'utf-8')
  );
  zip.addFile(
    `${DocumentationProduct.elasticsearch}/manifest.json`,
    Buffer.from(JSON.stringify(esManifest, undefined, 2), 'utf-8')
  );

  // Add elasticsearch content folder
  const esContentFolder = Path.join(esBuildFolder, 'content');
  try {
    await Fs.access(esContentFolder);
    zip.addLocalFolder(esContentFolder, `${DocumentationProduct.elasticsearch}/content`);
  } catch (error) {
    log.warn(`Could not add elasticsearch content folder: ${error}`);
  }

  // Add kibana folder contents
  const kibanaBuildFolder = Path.join(buildFolder, DocumentationProduct.kibana);
  const kibanaManifest = getArtifactManifest({
    productName: DocumentationProduct.kibana,
    stackVersion,
    formatVersion: LATEST_MANIFEST_FORMAT_VERSION,
  });

  zip.addFile(
    `${DocumentationProduct.kibana}/mappings.json`,
    Buffer.from(mappingFileContent, 'utf-8')
  );
  zip.addFile(
    `${DocumentationProduct.kibana}/manifest.json`,
    Buffer.from(JSON.stringify(kibanaManifest, undefined, 2), 'utf-8')
  );

  // Add kibana content folder
  const kibanaContentFolder = Path.join(kibanaBuildFolder, 'content');
  try {
    await Fs.access(kibanaContentFolder);
    zip.addLocalFolder(kibanaContentFolder, `${DocumentationProduct.kibana}/content`);
  } catch (error) {
    log.warn(`Could not add kibana content folder: ${error}`);
  }

  // Ensure target folder exists
  await Fs.mkdir(targetFolder, { recursive: true });

  const artifactName = `kb-product-doc-openapi-${stackVersion}.zip`;
  const artifactPath = Path.join(targetFolder, artifactName);
  zip.writeZip(artifactPath);

  log.info(`Finished creating combined OpenAPI artifact [${artifactName}]`);
};
