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
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';
import type { ChangelogEntry } from '../saved_objects/schemas/types';

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
  pipeline: Omit<Pipeline, 'name'>
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

interface FieldYamlEntry {
  name: string;
  type: string;
  description?: string;
  fields?: FieldYamlEntry[];
}

/**
 * Converts flat dotted-name field entries into the nested group structure
 * expected by the Fleet fields YAML format.
 */
const buildNestedFieldStructure = (flatFields: FieldMappingEntry[]): FieldYamlEntry[] => {
  const root: FieldYamlEntry[] = [];

  for (const field of flatFields) {
    const parts = field.name.split('.');
    let currentLevel = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLeaf = i === parts.length - 1;

      let existing = currentLevel.find((f) => f.name === part);
      if (!existing) {
        if (isLeaf) {
          existing = { name: part, type: field.type };
        } else {
          existing = { name: part, type: 'group', fields: [] };
        }
        currentLevel.push(existing);
      } else if (!isLeaf && !existing.fields) {
        existing.type = 'group';
        existing.fields = [];
      }

      if (!isLeaf) {
        currentLevel = existing.fields ?? [];
      }
    }
  }

  return root;
};

const buildBaseFieldsYaml = (integrationName: string, dataStreamName: string): string => {
  const datasetName = `${integrationName}.${dataStreamName}`;
  const baseFields: FieldYamlEntry[] = [
    { name: 'data_stream.type', type: 'constant_keyword', description: 'Data stream type.' },
    {
      name: 'data_stream.dataset',
      type: 'constant_keyword',
      description: 'Data stream dataset name.',
    },
    {
      name: 'data_stream.namespace',
      type: 'constant_keyword',
      description: 'Data stream namespace.',
    },
    { name: 'event.module', type: 'constant_keyword', description: 'Event module.' },
    { name: 'event.dataset', type: 'constant_keyword', description: 'Event dataset.' },
    { name: '@timestamp', type: 'date', description: 'Event timestamp.' },
  ];

  const yamlEntries = baseFields.map((field) => {
    const entry: Record<string, unknown> = {
      name: field.name,
      type: field.type,
      description: field.description,
    };
    if (field.name === 'event.module') {
      entry.value = integrationName;
    }
    if (field.name === 'event.dataset') {
      entry.value = datasetName;
    }
    return entry;
  });

  return dump(yamlEntries, { lineWidth: -1 });
};

const buildCustomFieldsYaml = (fieldMappings: FieldMappingEntry[]): string => {
  const customFields = fieldMappings.filter((f) => !f.is_ecs);
  if (customFields.length === 0) return dump([], { lineWidth: -1 });

  const nested = buildNestedFieldStructure(customFields);
  return dump(nested, { sortKeys: false, lineWidth: -1 });
};

export const addFieldsToZip = (
  zip: AdmZip,
  rootDir: string,
  dataStreamName: string,
  integrationName: string,
  fieldMappings: FieldMappingEntry[]
): void => {
  const fieldsDir = path.join(rootDir, 'data_stream', dataStreamName, 'fields');

  const baseFieldsYaml = buildBaseFieldsYaml(integrationName, dataStreamName);
  zip.addFile(path.join(fieldsDir, 'base-fields.yml'), Buffer.from(baseFieldsYaml));

  const customFieldsYaml = buildCustomFieldsYaml(fieldMappings);
  zip.addFile(path.join(fieldsDir, 'fields.yml'), Buffer.from(customFieldsYaml));
};

export const addChangelogToZip = (
  zip: AdmZip,
  rootDir: string,
  changelog: ChangelogEntry[]
): void => {
  if (changelog.length === 0) return;

  const yamlContent = dump(changelog, { lineWidth: -1, quotingType: '"', forceQuotes: true });
  zip.addFile(path.join(rootDir, 'changelog.yml'), Buffer.from(yamlContent));
};

export const addReadmeToZip = (zip: AdmZip, rootDir: string, readmeContent: string): void => {
  zip.addFile(path.join(rootDir, 'docs', 'README.md'), Buffer.from(readmeContent));
};

export const addLogoToZip = (zip: AdmZip, rootDir: string, logoBase64: string): void => {
  const logoBuffer = Buffer.from(logoBase64, 'base64');
  zip.addFile(path.join(rootDir, 'img', 'logo.svg'), logoBuffer);
};
