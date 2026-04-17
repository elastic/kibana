/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import AdmZip from 'adm-zip';
import type { Pipeline } from '@kbn/ingest-pipelines-plugin/common/types';
import type { IFieldsMetadataClient } from '@kbn/fields-metadata-plugin/server/services/fields_metadata/types';
import type { IntegrationAttributes, DataStreamAttributes } from '..';
import type { FieldMappingEntry } from '../saved_objects/saved_objects_service';
import type {
  DataStreamManifest,
  DataStreamManifestStream,
  DataStreamManifestVar,
  IntegrationManifest,
} from './types';
import {
  addAgentStreamToZip,
  addChangelogToZip,
  addDataStreamToZip,
  addFieldsToZip,
  addIngestPipelineToZip,
  addLogoToZip,
  addManifestToZip,
  addReadmeToZip,
} from './util';
import { generateFieldMappings } from './fields';
import { buildReadme } from './package_readme';
import { getInputVars } from './input_vars';

const FORMAT_VERSION = '3.4.0';
const KIBANA_MIN_VERSION = '^9.3.0';

export interface BuildIntegrationPackageResult {
  buffer: Buffer;
  packageName: string;
}

const COMMON_STREAM_VARS: DataStreamManifestVar[] = [
  {
    name: 'preserve_original_event',
    required: true,
    show_user: true,
    title: 'Preserve original event',
    description: 'Preserves a raw copy of the original event, added to the field `event.original`',
    type: 'bool',
    default: false,
  },
  {
    name: 'tags',
    type: 'text',
    title: 'Tags',
    multi: true,
    required: true,
    show_user: false,
    default: ['forwarded'],
  },
  {
    name: 'processors',
    type: 'yaml',
    title: 'Processors',
    multi: false,
    required: false,
    show_user: false,
    description:
      'Processors are used to reduce the number of fields in the exported event or to enhance the event with metadata.',
  },
];

const createStreamForInput = (
  inputType: string,
  dataStream: DataStreamAttributes
): DataStreamManifestStream => {
  const inputSpecificVars = getInputVars(inputType);

  return {
    input: inputType,
    template_path: `${inputType.replaceAll('-', '_')}.yml.hbs`,
    title: dataStream.title,
    description: dataStream.description,
    vars: [...inputSpecificVars, ...COMMON_STREAM_VARS],
  };
};

const createDataStreamManifest = (dataStream: DataStreamAttributes): DataStreamManifest => {
  const streams = dataStream.input_types.map((inputType) =>
    createStreamForInput(inputType, dataStream)
  );

  return {
    title: dataStream.title,
    type: 'logs',
    streams,
  };
};

const createManifest = (
  integration: IntegrationAttributes,
  dataStreams: DataStreamAttributes[]
): IntegrationManifest => {
  const name = integration.integration_id;
  const title = integration.metadata?.title ?? name;
  const version = integration.metadata?.version || '1.0.0';
  const description = integration.metadata?.description ?? '';

  const policyTemplates =
    dataStreams.length > 0
      ? [
          {
            name,
            title,
            description,
            inputs: [
              ...new Map(
                dataStreams
                  .flatMap((ds) =>
                    ds.input_types.map((inputType) => ({
                      type: inputType,
                      title: `Collect ${ds.title} via ${inputType}`,
                      description: `Collecting ${ds.title} from ${inputType}`,
                    }))
                  )
                  .map((input) => [input.type, input])
              ).values(),
            ],
          },
        ]
      : [];

  const manifest: IntegrationManifest = {
    format_version: FORMAT_VERSION,
    name,
    title,
    version,
    description,
    type: 'integration',
    categories: integration.metadata?.categories ?? ['security'],
    conditions: {
      kibana: {
        version: KIBANA_MIN_VERSION,
      },
    },
    policy_templates: policyTemplates,
    owner: {
      github: '@elastic/integration-experience',
      type: 'community',
    },
  };

  if (integration.metadata?.logo) {
    manifest.icons = [
      {
        src: '/img/logo.svg',
        title: `${title} logo`,
        size: '32x32',
        type: 'image/svg+xml',
      },
    ];
  }

  return manifest;
};

export const buildIntegrationPackage = async (
  integration: IntegrationAttributes,
  dataStreams: DataStreamAttributes[],
  fieldsMetadataClient: IFieldsMetadataClient
): Promise<BuildIntegrationPackageResult> => {
  const manifest = createManifest(integration, dataStreams);
  const packageName = `${manifest.name}-${manifest.version}`;

  const zip = new AdmZip();
  addManifestToZip(zip, packageName, manifest);

  const changelog = integration.changelog?.length
    ? integration.changelog
    : [
        {
          version: manifest.version,
          changes: [
            {
              description: `Initial release of ${manifest.title}`,
              type: 'enhancement' as const,
              link: '',
            },
          ],
        },
      ];
  addChangelogToZip(zip, packageName, changelog);

  const fieldMappingsPerStream = new Map<string, FieldMappingEntry[]>();

  for (const dataStream of dataStreams) {
    const dataStreamManifest = createDataStreamManifest(dataStream);
    addDataStreamToZip(zip, packageName, dataStream.data_stream_id, dataStreamManifest);

    if (dataStream.result?.ingest_pipeline) {
      const { processors, on_failure } = dataStream.result.ingest_pipeline;
      addIngestPipelineToZip(zip, packageName, dataStream.data_stream_id, {
        processors: processors as Pipeline['processors'],
        on_failure: on_failure as Pipeline['on_failure'],
      });
    }

    addAgentStreamToZip(zip, packageName, dataStream.data_stream_id, dataStream.input_types);

    const fieldMappings =
      dataStream.result?.field_mapping ??
      (await generateFieldMappings(
        (dataStream.result?.pipeline_docs as Array<Record<string, unknown>>) ?? [],
        fieldsMetadataClient
      ));
    fieldMappingsPerStream.set(dataStream.data_stream_id, fieldMappings);
    addFieldsToZip(zip, packageName, dataStream.data_stream_id, manifest.name, fieldMappings);
  }

  const readmeContent = buildReadme(integration, dataStreams, fieldMappingsPerStream);
  addReadmeToZip(zip, packageName, readmeContent);

  if (integration.metadata?.logo) {
    addLogoToZip(zip, packageName, integration.metadata.logo);
  }

  const buffer = await zip.toBufferPromise();
  return { buffer, packageName };
};
