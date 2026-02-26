/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';
import type AdmZip from 'adm-zip';
import path from 'path';
import type { Pipeline } from '@kbn/ingest-pipelines-plugin/common/types';
import type { DataStreamManifest, IntegrationManifest } from './types';
import { buildAgentTemplate } from './agent_templates';

export const addManifestToZip = (
  zip: AdmZip,
  rootDir: string,
  manifest: IntegrationManifest
): void => {
  const yamlContent = dump(manifest, { lineWidth: -1 });
  zip.addFile(path.join(rootDir, 'manifest.yml'), Buffer.from(yamlContent));
};

export const addDataStreamToZip = (
  zip: AdmZip,
  rootDir: string,
  dataStreamName: string,
  dataStreamManifest: DataStreamManifest
): void => {
  const dataStreamDir = path.join(rootDir, 'data_stream', dataStreamName);
  const yamlContent = dump(dataStreamManifest, { lineWidth: -1 });
  zip.addFile(path.join(dataStreamDir, 'manifest.yml'), Buffer.from(yamlContent));
};

export const addIngestPipelineToZip = (
  zip: AdmZip,
  rootDir: string,
  dataStreamName: string,
  pipeline: Pipeline
): void => {
  const pipelinePath = path.join(
    rootDir,
    'data_stream',
    dataStreamName,
    'elasticsearch',
    'ingest_pipeline',
    'default.yml'
  );
  const yamlContent = `---\n${dump(pipeline, { sortKeys: false, lineWidth: -1 })}`;
  zip.addFile(pipelinePath, Buffer.from(yamlContent));
};

export const addAgentStreamToZip = (
  zip: AdmZip,
  rootDir: string,
  dataStreamName: string,
  inputTypes: string[]
): void => {
  for (const inputType of inputTypes) {
    const templateContent = buildAgentTemplate(inputType);
    const templatePath = path.join(
      rootDir,
      'data_stream',
      dataStreamName,
      'agent',
      'stream',
      `${inputType}.yml.hbs`
    );
    zip.addFile(templatePath, Buffer.from(templateContent));
  }
};
