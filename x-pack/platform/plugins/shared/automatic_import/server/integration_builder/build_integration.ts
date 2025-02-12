/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDataPath } from '@kbn/utils';
import AdmZip from 'adm-zip';
import { dump } from 'js-yaml';
import nunjucks from 'nunjucks';
import { join as joinPath } from 'path';
import type { DataStream, Integration } from '../../common';
import { DATASTREAM_NAME_REGEX_PATTERN, NAME_REGEX_PATTERN } from '../../common/constants';
import { createSync, ensureDirSync, generateUniqueId, removeDirSync } from '../util';
import { Field, flattenObjectsList } from '../util/samples';
import { createAgentInput } from './agent';
import { FORMAT_VERSION, KIBANA_MINIMUM_VERSION } from './constants';
import { createDataStream } from './data_stream';
import { createFieldMapping } from './fields';
import { createPipeline } from './pipeline';
import { createReadme } from './readme_files';

const initialVersion = '1.0.0';

function configureNunjucks() {
  const templateDir = joinPath(__dirname, '../templates');
  const agentTemplates = joinPath(templateDir, 'agent');
  const manifestTemplates = joinPath(templateDir, 'manifest');
  const systemTestTemplates = joinPath(templateDir, 'system_tests');
  nunjucks.configure([templateDir, agentTemplates, manifestTemplates, systemTestTemplates], {
    autoescape: false,
  });
}

export async function buildPackage(integration: Integration): Promise<Buffer> {
  configureNunjucks();

  if (!isValidName(integration.name)) {
    throw new Error(
      `Invalid integration name: ${integration.name}, Should only contain letters, numbers and underscores`
    );
  }

  const workingDir = joinPath(getDataPath(), `automatic-import-${generateUniqueId()}`);
  const packageDirectoryName = `${integration.name}-${initialVersion}`;
  const packageDir = createDirectories(workingDir, integration, packageDirectoryName);

  const dataStreamsDir = joinPath(packageDir, 'data_stream');
  const fieldsPerDatastream = integration.dataStreams.map((dataStream) => {
    const dataStreamName = dataStream.name;
    if (!isValidDatastreamName(dataStreamName)) {
      throw new Error(
        `Invalid datastream name: ${dataStreamName}, Name must be at least 2 characters long and can only contain lowercase letters, numbers, and underscores`
      );
    }
    const specificDataStreamDir = joinPath(dataStreamsDir, dataStreamName);

    const dataStreamFields = createDataStream(integration.name, specificDataStreamDir, dataStream);
    createAgentInput(specificDataStreamDir, dataStream.inputTypes, dataStream.celInput);
    createPipeline(specificDataStreamDir, dataStream.pipeline);
    const fields = createFieldMapping(
      integration.name,
      dataStreamName,
      specificDataStreamDir,
      dataStream.docs
    );

    return {
      datastream: dataStreamName,
      fields: mergeAndSortFields(fields, dataStreamFields),
    };
  });

  createReadme(packageDir, integration.name, integration.dataStreams, fieldsPerDatastream);
  const zipBuffer = await createZipArchive(integration, workingDir, packageDirectoryName);

  removeDirSync(workingDir);
  return zipBuffer;
}

export function isValidName(input: string): boolean {
  return input.length > 0 && NAME_REGEX_PATTERN.test(input);
}

export function isValidDatastreamName(input: string): boolean {
  return input.length > 0 && DATASTREAM_NAME_REGEX_PATTERN.test(input);
}

function createDirectories(
  workingDir: string,
  integration: Integration,
  packageDirectoryName: string
): string {
  const packageDir = joinPath(workingDir, packageDirectoryName);
  ensureDirSync(workingDir);
  ensureDirSync(packageDir);
  createPackage(packageDir, integration);
  return packageDir;
}

function createPackage(packageDir: string, integration: Integration): void {
  createChangelog(packageDir);
  createBuildFile(packageDir);
  createPackageManifest(packageDir, integration);
  //  Skipping creation of system tests temporarily for custom package generation
  //  createPackageSystemTests(packageDir, integration);
}

function createBuildFile(packageDir: string): void {
  const buildFile = nunjucks.render('build.yml.njk', { ecs_version: '8.11.0' });
  const buildDir = joinPath(packageDir, '_dev/build');

  ensureDirSync(buildDir);
  createSync(joinPath(buildDir, 'build.yml'), buildFile);
}

function createChangelog(packageDir: string): void {
  const changelogTemplate = nunjucks.render('changelog.yml.njk', {
    initial_version: initialVersion,
  });

  createSync(joinPath(packageDir, 'changelog.yml'), changelogTemplate);
}

async function createZipArchive(
  integration: Integration,
  workingDir: string,
  packageDirectoryName: string
): Promise<Buffer> {
  const tmpPackageDir = joinPath(workingDir, packageDirectoryName);
  const zip = new AdmZip();
  zip.addLocalFolder(tmpPackageDir, packageDirectoryName);

  if (integration.logo) {
    const logoDir = joinPath(packageDirectoryName, 'img/logo.svg');
    const logoBuffer = Buffer.from(integration.logo, 'base64');
    zip.addFile(logoDir, logoBuffer);
  }
  const buffer = zip.toBuffer();
  return buffer;
}

function mergeAndSortFields(fields: Field[], dataStreamFields: Field[]): Field[] {
  const mergedFields = [...fields, ...dataStreamFields];

  return flattenObjectsList(mergedFields);
}

/* eslint-disable @typescript-eslint/naming-convention */
/**
 * Creates a package manifest dictionary.
 *
 * @param format_version - The format version of the package.
 * @param package_title - The title of the package.
 * @param package_name - The name of the package.
 * @param package_version - The version of the package.
 * @param package_description - The description of the package.
 * @param package_logo - The package logo file name, if present.
 * @param package_owner - The owner of the package.
 * @param min_version - The minimum version of Kibana required for the package.
 * @param inputs - An array of unique input objects containing type, title, and description.
 * @returns The package manifest dictionary.
 */
function createPackageManifestDict(
  format_version: string,
  package_title: string,
  package_name: string,
  package_version: string,
  package_description: string,
  package_logo: string | undefined,
  package_owner: string,
  min_version: string,
  inputs: Array<{ type: string; title: string; description: string }>
): { [key: string]: string | object } {
  const data: { [key: string]: string | object } = {
    format_version,
    name: package_name,
    title: package_title,
    version: package_version,
    description: package_description,
    type: 'integration',
    categories: ['security', 'iam'],
    conditions: {
      kibana: {
        version: min_version,
      },
    },
    policy_templates: [
      {
        name: package_name,
        title: package_title,
        description: package_description,
        inputs: inputs.map((input) => ({
          type: input.type,
          title: `${input.title} : ${input.type}`,
          description: input.description,
        })),
      },
    ],
    owner: {
      github: package_owner,
      type: 'community',
    },
  };

  if (package_logo !== undefined && package_logo !== '') {
    data.icons = [
      {
        src: '/img/logo.svg',
        title: `${package_title} Logo`,
        size: '32x32',
        type: 'image/svg+xml',
      },
    ];
  }
  return data;
}
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Render the package manifest for an integration.
 *
 * @param integration - The integration object.
 * @returns The package manifest YAML rendered into a string.
 */
export function renderPackageManifestYAML(integration: Integration): string {
  const uniqueInputs: { [key: string]: { type: string; title: string; description: string } } = {};

  integration.dataStreams.forEach((dataStream: DataStream) => {
    dataStream.inputTypes.forEach((inputType: string) => {
      if (!uniqueInputs[inputType]) {
        uniqueInputs[inputType] = {
          type: inputType,
          title: dataStream.title,
          description: dataStream.description,
        };
      }
    });
  });

  const uniqueInputsList = Object.values(uniqueInputs);

  const packageData = createPackageManifestDict(
    FORMAT_VERSION, // format_version
    integration.title, // package_title
    integration.name, // package_name
    initialVersion, // package_version
    integration.description, // package_description
    integration.logo, // package_logo
    '@elastic/custom-integrations', // package_owner
    KIBANA_MINIMUM_VERSION, // min_version
    uniqueInputsList // inputs
  );

  return dump(packageData);
}

function createPackageManifest(packageDir: string, integration: Integration): void {
  const packageManifest = renderPackageManifestYAML(integration);
  createSync(joinPath(packageDir, 'manifest.yml'), packageManifest);
}
