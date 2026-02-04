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
import { DocumentationProduct, LATEST_MANIFEST_FORMAT_VERSION } from '@kbn/product-doc-common';
import type { ProductName } from '@kbn/product-doc-common';
import { defaultInferenceEndpoints } from '@kbn/inference-common';
import { getArtifactMappings } from '../../artifact/mappings';
import { getArtifactManifest } from '../../artifact/manifest';
import type { SemanticTextMapping } from '../create_index';

const isImpliedDefaultElserInferenceId = (inferenceId: string | null | undefined): boolean => {
  return (
    inferenceId === null ||
    inferenceId === undefined ||
    inferenceId === defaultInferenceEndpoints.ELSER ||
    inferenceId === defaultInferenceEndpoints.ELSER_IN_EIS_INFERENCE_ID ||
    (typeof inferenceId === 'string' && inferenceId.toLowerCase().includes('elser'))
  );
};

interface AddProductToZipParams {
  zip: AdmZip;
  productName: ProductName;
  buildFolder: string;
  stackVersion: string;
  mappingFileContent: string;
  log: ToolingLog;
}

const addProductToZip = async ({
  zip,
  productName,
  buildFolder,
  stackVersion,
  mappingFileContent,
  log,
}: AddProductToZipParams) => {
  const productBuildFolder = Path.join(buildFolder, productName);
  const manifest = getArtifactManifest({
    productName,
    stackVersion,
    formatVersion: LATEST_MANIFEST_FORMAT_VERSION,
  });

  // Add mappings.json
  zip.addFile(`${productName}/mappings.json`, Buffer.from(mappingFileContent, 'utf-8'));

  // Add manifest.json
  zip.addFile(
    `${productName}/manifest.json`,
    Buffer.from(JSON.stringify(manifest, undefined, 2), 'utf-8')
  );

  // Add content folder
  const contentFolder = Path.join(productBuildFolder, 'content');
  try {
    await Fs.access(contentFolder);
    zip.addLocalFolder(contentFolder, `${productName}/content`);
  } catch (error) {
    log.warning(`Could not add ${productName} content folder: ${error}`);
  }
};

export const createCombinedOpenAPIArtifact = async ({
  buildFolder,
  targetFolder,
  stackVersion,
  log,
  semanticTextMapping,
  inferenceId,
}: {
  buildFolder: string;
  targetFolder: string;
  stackVersion: string;
  log: ToolingLog;
  semanticTextMapping: SemanticTextMapping;
  inferenceId: string;
}) => {
  log.info(
    `Starting to create combined OpenAPI artifact from build folder [${buildFolder}] into target [${targetFolder}]`
  );

  const zip = new AdmZip();
  const mappings = getArtifactMappings(semanticTextMapping);
  const mappingFileContent = JSON.stringify(mappings, undefined, 2);

  // Add both products to the zip
  for (const productName of [DocumentationProduct.elasticsearch, DocumentationProduct.kibana]) {
    await addProductToZip({
      zip,
      productName,
      buildFolder,
      stackVersion,
      mappingFileContent,
      log,
    });
  }

  // Generate artifact name with inference ID suffix if not default ELSER
  const inferenceIdSuffix = isImpliedDefaultElserInferenceId(inferenceId) ? '' : `--${inferenceId}`;
  const artifactName = `kb-product-doc-openapi-${stackVersion}${inferenceIdSuffix}.zip`;

  // Ensure target folder exists and write zip
  await Fs.mkdir(targetFolder, { recursive: true });
  const artifactPath = Path.join(targetFolder, artifactName);
  zip.writeZip(artifactPath);

  log.info(`Finished creating combined OpenAPI artifact [${artifactName}]`);
};
