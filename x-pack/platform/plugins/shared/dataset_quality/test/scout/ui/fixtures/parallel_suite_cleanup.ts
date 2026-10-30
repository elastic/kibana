/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsClient, ScoutLogger } from '@kbn/scout';
import {
  buildDataStreamName,
  cleanUpAll,
  datasetNames,
  deleteComponentTemplateIfExists,
  deleteDataStreamIfExists,
  deleteIndexTemplateIfExists,
  deletePipelineIfExists,
} from '../../common';

// Everything the parallel specs create, listed by exact name so this never touches what the
// sequential suite creates. Add new resources here: the parallel specs must not delete data
// streams after seeding, because the list page lists every `logs-*-*` data stream and then
// reads their stats by name, so one deleted in between by another worker 404s that request.
const NAMESPACES = [
  'dqhome',
  'dqessentials',
  'dqsummaryhealthy',
  'dqsummarymixed',
  'dqsummarysize',
];
const DATASETS = [
  'alertacc.logs',
  'privno.logs',
  'synth.degraded.charlimit',
  'synth.degraded.flyout',
  'synth.degradedfields',
  'synth.detailssize',
  'synth.discover',
  'synth.discover.degraded',
  'synth.faileddocs',
  'synth.fscount',
  'synth.fsdisabled',
  'synth.fsenabled',
  'synth.fstable',
  'synth.malformed.rca',
  'synth.navigation',
  'synth.nodegradedfields',
];
const DATA_STREAMS = [
  ...DATASETS.map((dataset) => buildDataStreamName({ dataset })),
  ...NAMESPACES.flatMap((namespace) =>
    datasetNames.map((dataset) => buildDataStreamName({ dataset, namespace }))
  ),
];
const INDEX_TEMPLATES = [
  'logs-synth.degraded.charlimit-default',
  'logs-synth.malformed.rca-default',
  'synth-faileddocs',
  'synth-failurestore-off',
  'synth-failurestore-on',
  'synth-fscount',
];
const COMPONENT_TEMPLATES = [
  'logs-synth-charlimit@mappings',
  'logs-synth-malformed-rca@mappings',
  'synth-faileddocs@custom',
  'synth-failurestore-off@custom',
  'synth-failurestore-on@custom',
  'synth-fscount@custom',
];
const PIPELINES = [
  'synth-faileddocs@pipeline',
  'synth-failurestore@pipeline',
  'synth-fscount@pipeline',
];

/**
 * Deletes everything the parallel specs create. Runs once before and once after the whole
 * suite, so no spec deletes a data stream while another worker has the list page open.
 * Data streams go first: an index template cannot be deleted while a data stream uses it.
 */
export async function deleteParallelSuiteResources(
  esClient: EsClient,
  log: ScoutLogger
): Promise<void> {
  await cleanUpAll([
    ...DATA_STREAMS.map((name) => () => deleteDataStreamIfExists(esClient, name, log)),
    ...INDEX_TEMPLATES.map((name) => () => deleteIndexTemplateIfExists(esClient, name, log)),
    ...COMPONENT_TEMPLATES.map(
      (name) => () => deleteComponentTemplateIfExists(esClient, name, log)
    ),
    ...PIPELINES.map((id) => () => deletePipelineIfExists(esClient, id, log)),
  ]);
}
