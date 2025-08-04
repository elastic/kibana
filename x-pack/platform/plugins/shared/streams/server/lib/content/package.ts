/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import YAML from 'yaml';
import { ContentPack, ROOT_STREAM_ID } from '@kbn/content-packs-schema';
import { isDataStreamPipeline } from '@kbn/fleet-plugin/server/services/epm/elasticsearch/ingest_pipeline/install';
import { generateMappings } from '@kbn/fleet-plugin/server/services/epm/elasticsearch/template/template';
import { loadDatastreamsFieldsFromYaml } from '@kbn/fleet-plugin/server/services/epm/fields/field';
import {
  fetchFindLatestPackageOrThrow,
  getPackage,
} from '@kbn/fleet-plugin/server/services/epm/registry';
import {
  DissectProcessorConfig,
  FieldDefinition,
  GrokProcessorConfig,
  Streams,
} from '@kbn/streams-schema';
import { EcsFlat } from '@elastic/ecs';
import { baseFields } from '../streams/component_templates/logs_layer';
import { FieldDefinitionType } from '@kbn/streams-schema/src/fields';

export async function packageAsContentPack({ name }: { name: string }): Promise<ContentPack> {
  const pkgKey = await fetchFindLatestPackageOrThrow(name);
  const pkg = await getPackage(pkgKey.name, pkgKey.version);
  const contentPack: ContentPack = {
    name,
    description: pkg.packageInfo.description ?? `${name} package`,
    version: pkgKey.version,
    entries: [],
  };
  if (!pkg.packageInfo.data_streams?.length) {
    return contentPack;
  }

  const streams: { dataset: string; name: string; request: Streams.WiredStream.UpsertRequest }[] =
    pkg.packageInfo.data_streams
      .filter((ds) => ds.type === 'logs')
      .map((ds) => {
        const { properties } = generateMappings(
          loadDatastreamsFieldsFromYaml(pkg, pkg.assetsMap, ds.path)
        );

        let fieldsFromProcessors: FieldDefinition = {};
        const pipelines = pkg.paths
          .filter((path) => isDataStreamPipeline(path, ds.path) && path.endsWith('default.yml'))
          .map((path) => {
            const buf = pkg.assetsMap.get(path);
            if (!buf) {
              throw new Error(`Asset not found: ${path}`);
            }

            const pipeline = YAML.parse(buf.toString('utf8')) as { processors: any[] };
            const processors = pipeline.processors.filter(
              // don't handle pipeline processor but there should be no issue
              // with conditional processors
              (processor) => !('pipeline' in processor)
            );
            processors.forEach((processor) => {
              // there's likely more processors to specially handle here
              if ('grok' in processor) {
                const grokConfig = processor.grok as GrokProcessorConfig;
                grokConfig.patterns.forEach((pattern) => {
                  fieldsFromProcessors = {
                    ...fieldsFromProcessors,
                    ...fieldsFromGrokPattern(pattern),
                  };
                });
                Object.values(grokConfig.pattern_definitions ?? {})?.forEach((definition) => {
                  fieldsFromProcessors = {
                    ...fieldsFromProcessors,
                    ...fieldsFromGrokPattern(definition),
                  };
                });
              }

              if ('dissect' in processor) {
                const dissectConfig = processor.dissect as DissectProcessorConfig;
                fieldsFromProcessors = {
                  ...fieldsFromProcessors,
                  ...fieldsFromDissectPattern(dissectConfig.pattern),
                };
              }

              if ('uri_parts' in processor) {
                fieldsFromProcessors = {
                  ...fieldsFromProcessors,
                  ...{
                    'url.original': { type: 'keyword' },
                    'url.domain': { type: 'keyword' },
                    'url.port': { type: 'long' },
                  },
                };
              }

              if ('user_agent' in processor) {
                fieldsFromProcessors = {
                  ...fieldsFromProcessors,
                  ...{
                    'user_agent.device.name': { type: 'keyword' },
                    'user_agent.name': { type: 'keyword' },
                    'user_agent.original': { type: 'keyword' },
                    'user_agent.os.family': { type: 'keyword' },
                    'user_agent.os.full': { type: 'keyword' },
                    'user_agent.os.kernel': { type: 'keyword' },
                    'user_agent.os.name': { type: 'keyword' },
                    'user_agent.os.platform': { type: 'keyword' },
                    'user_agent.os.type': { type: 'keyword' },
                    'user_agent.os.version': { type: 'keyword' },
                    'user_agent.version': { type: 'keyword' },
                  },
                };
              }
            });
            return { ...pipeline, processors };
          });

        const mappedFields = Object.entries({
          ...Object.entries(fieldsFromProcessors).reduce((acc, [key, value]) => {
            if ((EcsFlat as Record<string, any>)[key]) {
              acc[key] = value;
            }
            return acc;
          }, {} as FieldDefinition),
          ...mappingsAsFields(properties),
        })
          .filter(([key, value]) => {
            // some special cases that likely need more thoughts
            return (
              !baseFields[key] &&
              key !== 'message' &&
              (value.type as string) !== 'object' &&
              (value.type as string) !== 'alias'
            );
          })
          .reduce((acc, [key, value]) => {
            acc[key] = value;
            return acc;
          }, {} as FieldDefinition);

        return {
          dataset: ds.dataset,
          name: ds.dataset.split('.').pop()!,
          request: {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: [
                  {
                    manual_ingest_pipeline: {
                      if: { always: {} },
                      // integration pipeline expects data to be in message field
                      processors: [{ set: { field: 'message', copy_from: 'body.text' } }],
                    },
                  },
                  {
                    manual_ingest_pipeline: {
                      if: { always: {} },
                      // integration processors as-is (minus pipeline processor)
                      processors: pipelines[0].processors,
                    },
                  },
                  {
                    manual_ingest_pipeline: {
                      if: { always: {} },
                      // streams require scoped ecs. need more logic here since
                      // some fields belong to resource.attributes.* and other attributes.*
                      processors: Object.keys(mappedFields).map((field) => ({
                        rename: {
                          field: field,
                          target_field: `attributes.${field}`,
                          ignore_missing: true,
                        },
                      })),
                    },
                  },
                  {
                    manual_ingest_pipeline: {
                      if: { always: {} },
                      processors: [
                        {
                          remove: {
                            field: 'message',
                            ignore_missing: true,
                          },
                        },
                      ],
                    },
                  },
                ],
                wired: {
                  fields: Object.entries(mappedFields).reduce((acc, [key, value]) => {
                    acc[`attributes.${key}`] = value;
                    return acc;
                  }, {} as FieldDefinition),
                  routing: [],
                },
              },
            },
            dashboards: [],
            queries: [],
          },
        };
      });

  return {
    ...contentPack,
    entries: [
      {
        type: 'stream' as const,
        name: ROOT_STREAM_ID,
        request: {
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: [],
              wired: {
                fields: {},
                routing: streams.map(({ name, dataset }) => ({
                  destination: name,
                  if: {
                    field: 'attributes.data_stream.dataset',
                    operator: 'eq',
                    value: dataset,
                  },
                })),
              },
            },
          },
          dashboards: [],
          queries: [],
        },
      },

      ...streams.map(({ name, request }) => ({
        type: 'stream' as const,
        name,
        request,
      })),
    ],
  };
}

const mappingsAsFields = (properties: Record<string, any>, prefix = '') => {
  return Object.entries(properties).reduce((acc, [key, value]) => {
    if (typeof value.properties === 'object') {
      acc = {
        ...acc,
        ...mappingsAsFields(value.properties, `${prefix}${key}.`),
      };
    } else {
      acc[`${prefix}${key}`] = value;
    }
    return acc;
  }, {} as FieldDefinition);
};

// should use @kbn/grok-ui
function fieldsFromGrokPattern(pattern: string): FieldDefinition {
  const fieldRegex = /%{([^:}]+):(\w+(\.\w+)*)(?::([^}]+))?}/g;
  const PATTERN_TO_TYPE: Record<string, FieldDefinitionType> = { NUMBER: 'long', DATA: 'keyword' };
  const fieldDefinition: FieldDefinition = {};

  let match;
  while ((match = fieldRegex.exec(pattern)) !== null) {
    fieldDefinition[match[2]] = (() => {
      const pattern = match[1];
      const type = match[4] as FieldDefinitionType;
      return { type: type ? type : PATTERN_TO_TYPE[pattern] ?? 'keyword' };
    })();
  }

  return fieldDefinition;
}

function fieldsFromDissectPattern(pattern: string): FieldDefinition {
  const fieldRegex = /%\{(\w+(\.\w+)*)\}/g;
  const fieldDefinition: FieldDefinition = {};

  let match;
  while ((match = fieldRegex.exec(pattern)) !== null) {
    fieldDefinition[match[1]] = { type: 'keyword' };
  }

  return fieldDefinition;
}
