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
  getSecurityLabsLegacyDateVersion,
  LATEST_MANIFEST_FORMAT_VERSION,
} from '@kbn/product-doc-common';
import { getSecurityLabsMappings } from '../artifact/mappings';
import { getSecurityLabsManifest } from '../artifact/manifest';
import type { SemanticTextMapping } from '../artifact/semantic_text';

/**
 * Creates the final artifact zip file containing mappings, manifest, and content chunks.
 *
 * For timestamped ELSER builds, also writes a legacy `YYYY.MM.DD` alias zip for
 * Kibana 9.3/9.4 BWC (date-only parsers from
 * https://github.com/elastic/kibana/pull/246099). Jina / non-ELSER builds do not
 * get an alias.
 */
export const createArtifact = async ({
  buildFolder,
  targetFolder,
  version,
  inferenceId,
  semanticTextMapping,
  log,
}: {
  buildFolder: string;
  targetFolder: string;
  version: string;
  inferenceId?: string;
  semanticTextMapping?: SemanticTextMapping;
  log: ToolingLog;
}) => {
  log.info(
    `Starting to create artifact from build folder [${buildFolder}] into target [${targetFolder}]`
  );

  await Fs.mkdir(targetFolder, { recursive: true });

  const zip = new AdmZip();

  // Add mappings
  const mappings = getSecurityLabsMappings(semanticTextMapping);
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

  // Write the timestamped artifact
  const artifactName = getSecurityLabsArtifactName({ version, inferenceId });
  const artifactPath = Path.join(targetFolder, artifactName);
  zip.writeZip(artifactPath);
  log.info(`Finished creating artifact [${artifactName}]`);

  // ELSER-only legacy date alias for Kibana 9.3/9.4 BWC (#246099).
  // Same naming rules as getSecurityLabsArtifactName: default ELSER has no `--` suffix.
  const legacyDateVersion = getSecurityLabsLegacyDateVersion(version);
  const isDefaultElserArtifact = artifactName === getSecurityLabsArtifactName({ version });
  if (legacyDateVersion && isDefaultElserArtifact) {
    const legacyArtifactName = getSecurityLabsArtifactName({
      version: legacyDateVersion,
    });
    const legacyArtifactPath = Path.join(targetFolder, legacyArtifactName);
    await Fs.copyFile(artifactPath, legacyArtifactPath);
    log.info(
      `Also wrote legacy date-only ELSER alias [${legacyArtifactName}] for Kibana 9.3/9.4 BWC`
    );
  }

  // Dev-friendly local repository index for `file://` testing.
  // List every zip currently in the target folder so multi-inference builds
  // (ELSER + Jina) share one index.xml.
  const zipFiles = (await Fs.readdir(targetFolder)).filter((name) => name.endsWith('.zip')).sort();
  const contentsXml = zipFiles
    .map((name) => `  <Contents>\n    <Key>${name}</Key>\n  </Contents>`)
    .join('\n');
  const indexXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/">\n` +
    `  <Name>kibana-knowledge-base-artifacts</Name>\n` +
    `  <IsTruncated>false</IsTruncated>\n` +
    `${contentsXml}\n` +
    `</ListBucketResult>\n`;
  await Fs.writeFile(Path.join(targetFolder, 'index.xml'), indexXml, 'utf-8');
};
