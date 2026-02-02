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
import {
  getSecurityLabsArtifactName,
  LATEST_MANIFEST_FORMAT_VERSION,
} from '@kbn/product-doc-common';
import { getSecurityLabsMappings } from '../artifact/mappings';
import { getSecurityLabsManifest } from '../artifact/manifest';

/**
 * Creates the final artifact zip file containing mappings, manifest, and content chunks.
 */
export const createArtifact = async ({
  buildFolder,
  targetFolder,
  version,
  log,
}: {
  buildFolder: string;
  targetFolder: string;
  version: string;
  log: ToolingLog;
}) => {
  log.info(
    `Starting to create artifact from build folder [${buildFolder}] into target [${targetFolder}]`
  );

  const zip = new AdmZip();

  // Add mappings
  const mappings = getSecurityLabsMappings();
  const mappingFileContent = JSON.stringify(mappings, undefined, 2);
  zip.addFile('mappings.json', Buffer.from(mappingFileContent, 'utf-8'));

  // Add manifest
  const manifest = getSecurityLabsManifest({
    version,
    formatVersion: LATEST_MANIFEST_FORMAT_VERSION,
  });
  const manifestFileContent = JSON.stringify(manifest, undefined, 2);
  zip.addFile('manifest.json', Buffer.from(manifestFileContent, 'utf-8'));

  // Add content folder
  zip.addLocalFolder(buildFolder, 'content');

  // Write artifact
  const artifactName = getSecurityLabsArtifactName({ version });
  const artifactPath = Path.join(targetFolder, artifactName);
  zip.writeZip(artifactPath);

  // Dev-friendly local repository index for `file://` testing.
  // The Kibana installer expects an `index.xml` at the repository root.
  const indexXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">\n` +
    `  <Name>kibana-knowledge-base-artifacts</Name>\n` +
    `  <IsTruncated>false</IsTruncated>\n` +
    `  <Contents>\n` +
    `    <Key>${artifactName}</Key>\n` +
    `  </Contents>\n` +
    `</ListBucketResult>\n`;
  await Fs.mkdir(targetFolder, { recursive: true });
  await Fs.writeFile(Path.join(targetFolder, 'index.xml'), indexXml, 'utf-8');

  log.info(`Finished creating artifact [${artifactName}]`);
};
