/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core/server';

import { appContextService } from '..';

export async function updateDeprecatedComponentTemplates(esClient: ElasticsearchClient) {
  const componentTemplates = await esClient.cluster.getComponentTemplate({
    name: 'metrics-*',
  });

  const deprecatedTemplates = componentTemplates.component_templates.filter(
    (componentTemplate) =>
      componentTemplate.component_template._meta?.managed_by === 'fleet' &&
      !!componentTemplate.component_template.template.mappings?._source?.mode
  );

  appContextService
    .getLogger()
    .debug(
      `Updating component templates with deprecated _source.mode config: ${deprecatedTemplates.map(
        (template) => template.name
      )}`
    );

  await pMap(
    deprecatedTemplates,
    async (componentTemplate) => {
      const source = componentTemplate.component_template.template.mappings!._source;
      const { mode, ...restOfSource } = source!;
      const settings = componentTemplate.component_template.template.settings;
      await esClient.cluster.putComponentTemplate({
        name: componentTemplate.name,
        body: {
          template: {
            settings: {
              ...settings,
              index: {
                ...settings?.index,
                mapping: {
                  ...settings?.index?.mapping,
                  // @ts-expect-error Property 'source' does not exist on type 'IndicesMappingLimitSettings'
                  source: {
                    // @ts-expect-error Property 'source.mode' does not exist on type 'IndicesMappingLimitSettings'
                    ...settings?.index?.mapping?.source,
                    mode,
                  },
                },
              },
            },
            mappings: {
              ...componentTemplate.component_template.template.mappings,
              _source: restOfSource,
            },
          },
        },
      });
    },
    {
      concurrency: 10,
    }
  );
}
