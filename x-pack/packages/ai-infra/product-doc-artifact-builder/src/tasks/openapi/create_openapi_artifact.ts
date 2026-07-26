/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import AdmZip from 'adm-zip';
import type { ToolingLog } from '@kbn/tooling-log';
import type { OpenAPIV3 } from 'openapi-types';

export const createOpenAPIArtifact = async ({
  buildFolder,
  targetFolder,
  stackVersion,
  log,
  elasticsearchSpec,
  kibanaSpec,
}: {
  buildFolder: string;
  targetFolder: string;
  stackVersion: string;
  log: ToolingLog;
  elasticsearchSpec: OpenAPIV3.Document;
  kibanaSpec: OpenAPIV3.Document;
}) => {
  log.info(
    `Starting to create OpenAPI artifact from build folder [${buildFolder}] into target [${targetFolder}]`
  );

  const zip = new AdmZip();

  // Add the OpenAPI spec files
  zip.addFile(
    'elasticsearch.json',
    Buffer.from(JSON.stringify(elasticsearchSpec, null, 2), 'utf-8')
  );
  zip.addFile('kibana.json', Buffer.from(JSON.stringify(kibanaSpec, null, 2), 'utf-8'));

  const artifactName = `kb-product-doc-openapi-${stackVersion}.zip`;
  const artifactPath = Path.join(targetFolder, artifactName);

  // Ensure target folder exists
  const Fs = await import('fs/promises');
  await Fs.mkdir(targetFolder, { recursive: true });

  zip.writeZip(artifactPath);

  log.info(`Finished creating artifact [${artifactName}]`);
};
