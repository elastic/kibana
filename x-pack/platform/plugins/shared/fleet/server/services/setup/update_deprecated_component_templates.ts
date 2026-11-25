/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { IndicesSourceMode } from '@elastic/elasticsearch/lib/api/types';

import { appContextService } from '..';

const isIndexSettingsSourceMode = (mode: string | undefined): mode is IndicesSourceMode =>
  mode === 'disabled' || mode === 'stored' || mode === 'synthetic';

export async function updateDeprecatedComponentTemplates(esClient: ElasticsearchClient) {
  const componentTemplates = await esClient.cluster.getComponentTemplate({
    name: 'metrics-*',
  });

  const deprecatedTemplates = componentTemplates.component_templates.filter(
    (componentTemplate) =>
      componentTemplate.component_template._meta?.managed_by === 'fleet' &&
      isIndexSettingsSourceMode(
        componentTemplate.component_template.template.mappings?._source?.mode
      )
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
      // Mapping `_source.mode` also allows `columnar_stored`, which index settings do not.
      // Those templates are filtered out above; `mode` here is an `IndicesSourceMode`.
      if (!isIndexSettingsSourceMode(mode)) {
        return;
      }
      const settings = componentTemplate.component_template.template.settings;
      await esClient.cluster.putComponentTemplate({
        name: componentTemplate.name,
        template: {
          settings: {
            ...settings,
            index: {
              ...settings?.index,
              mapping: {
                ...settings?.index?.mapping,
                source: {
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
      });
    },
    {
      concurrency: 10,
    }
  );
}
