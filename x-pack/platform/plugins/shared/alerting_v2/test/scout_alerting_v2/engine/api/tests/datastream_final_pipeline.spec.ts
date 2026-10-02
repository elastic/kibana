/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Producers no longer set `@timestamp`; each data stream's `index.final_pipeline` assigns it at
 * ingest. These specs talk to Elasticsearch directly to check the resources Kibana installed at
 * startup. Patching backing indices created before the template had the setting is covered by
 * the `DatastreamInitializer` unit tests.
 */

import { expect } from '@kbn/scout/api';
import { tags } from '@kbn/scout';
import { getAlertActionsResourceDefinition } from '../../../../../server/resources/datastreams/alert_actions';
import { getAlertEventsResourceDefinition } from '../../../../../server/resources/datastreams/alert_events';
import { apiTest } from '../fixtures';

const MARKER = 'scout-final-pipeline';

const RESOURCES = [
  {
    definition: getAlertEventsResourceDefinition(),
    markerField: 'rule.id',
    document: { rule: { id: MARKER } },
  },
  {
    definition: getAlertActionsResourceDefinition(),
    markerField: 'rule_id',
    document: { rule_id: MARKER },
  },
];

apiTest.describe(
  'Alerting v2 data stream ingest timestamp pipeline',
  { tag: tags.stateful.all },
  () => {
    apiTest.afterAll(async ({ esClient }) => {
      for (const { definition, markerField } of RESOURCES) {
        await esClient.deleteByQuery(
          {
            index: definition.dataStreamName,
            query: { term: { [markerField]: MARKER } },
            refresh: true,
            conflicts: 'proceed',
          },
          { ignore: [404] }
        );
      }
    });

    for (const { definition, markerField, document } of RESOURCES) {
      const { dataStreamName, version, finalPipeline } = definition;

      apiTest(`${dataStreamName}: installs the managed ingest pipeline`, async ({ esClient }) => {
        const pipelines = await esClient.ingest.getPipeline({ id: finalPipeline.id });

        expect(pipelines[finalPipeline.id]).toMatchObject({
          version: finalPipeline.version,
          _meta: { managed: true },
        });
      });

      apiTest(
        `${dataStreamName}: index template sets index.final_pipeline at the current version`,
        async ({ esClient }) => {
          const { index_templates: templates } = await esClient.indices.getIndexTemplate({
            name: dataStreamName,
          });
          const [{ index_template: template }] = templates;

          expect(template._meta?.version).toBe(version);
          expect(template.template?.settings?.index?.final_pipeline).toBe(finalPipeline.id);
        }
      );

      apiTest(
        `${dataStreamName}: stamps timestamp on writes that omit it`,
        async ({ esClient }) => {
          await esClient.index({ index: dataStreamName, document, refresh: 'wait_for' });

          const { hits } = await esClient.search<{ '@timestamp'?: string }>({
            index: dataStreamName,
            query: { term: { [markerField]: MARKER } },
          });

          expect(hits.hits).toHaveLength(1);
          expect(Number.isNaN(Date.parse(hits.hits[0]._source?.['@timestamp'] ?? ''))).toBe(false);
        }
      );

      apiTest(
        `${dataStreamName}: every backing index has index.final_pipeline`,
        async ({ esClient }) => {
          const { data_streams: dataStreams } = await esClient.indices.getDataStream({
            name: dataStreamName,
          });
          const backingIndices = dataStreams[0].indices.map(({ index_name: name }) => name);
          const settings = await esClient.indices.getSettings({ index: backingIndices });

          expect(backingIndices.length).toBeGreaterThan(0);
          for (const index of backingIndices) {
            expect(settings[index].settings?.index?.final_pipeline).toBe(finalPipeline.id);
          }
        }
      );
    }
  }
);
