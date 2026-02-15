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
import type { MappingProperty, MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import { cloneDeep } from 'lodash';
import { getArtifactManifest } from '../../artifact/manifest';

const overrideInferenceSettings = (
  mappings: MappingTypeMapping,
  inferenceId: string,
  modelSettingsToOverride?: object
) => {
  const recursiveOverride = (current: MappingTypeMapping | MappingProperty) => {
    if ('type' in current && current.type === 'semantic_text') {
      current.inference_id = inferenceId;
      if (modelSettingsToOverride) {
        // @ts-expect-error - model_settings is not typed, but exists for semantic_text field
        current.model_settings = modelSettingsToOverride;
      }
    }
    if ('properties' in current && current.properties) {
      for (const prop of Object.values(current.properties)) {
        recursiveOverride(prop);
      }
    }
  };
  recursiveOverride(mappings);
};

const OPENAPI_SPEC_MAPPING = {
  properties: {
    // Semantic text fields for semantic search
    description: {
      type: 'semantic_text',
      inference_id: '.multilingual-e5-small-elasticsearch',
    },
    endpoint: {
      type: 'semantic_text',
      inference_id: '.multilingual-e5-small-elasticsearch',
    },
    summary: {
      type: 'semantic_text',
      inference_id: '.multilingual-e5-small-elasticsearch',
    },
    // Text fields for lexical search
    description_text: { type: 'text' },
    summary_text: { type: 'text' },
    operationId: { type: 'text' },
    // Keyword fields for exact and prefix matching
    method: { type: 'keyword' },
    path: {
      type: 'text',
      fields: {
        keyword: { type: 'keyword' },
      },
    },
    tags: { type: 'keyword' },
    // Nested and other fields
    parameters: {
      type: 'object',
      enabled: false,
    },
    responses: {
      type: 'object',
      enabled: false,
    },
    example: {
      type: 'object',
      enabled: false,
    },
  },
};

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
  inferenceId,
}: {
  buildFolder: string;
  targetFolder: string;
  stackVersion: string;
  log: ToolingLog;
  inferenceId: string;
}) => {
  log.info(
    `Starting to create combined OpenAPI artifact from build folder [${buildFolder}] into target [${targetFolder}]`
  );

  const zip = new AdmZip();

  const mappings = cloneDeep(OPENAPI_SPEC_MAPPING) as MappingTypeMapping;
  overrideInferenceSettings(mappings, inferenceId);
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
