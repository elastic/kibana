/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Fs from 'fs';
import Path from 'path';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import type { ToolingLog } from '@kbn/tooling-log';

/**
 * Elasticsearch's own ES|QL test dataset, loaded as a corpus index.
 *
 * The point is the *queries* that come with it: `x-pack/plugin/esql/qa/testFixtures` contains
 * thousands of hand-written ES|QL statements covering every command and a lot of genuinely
 * awkward shapes. They are only usable as gold if the data they run against exists, so the data
 * comes first.
 */
export const ES_TEST_INDEX = 'employees_test';

/**
 * Datasets worth loading, and the index each becomes.
 *
 * Breadth matters more than size here: every dataset loaded turns another slice of the spec
 * suite into executable gold, and they cover different shapes — staff records, flight data,
 * container metrics, a book catalogue.
 */
export const ES_TEST_DATASETS: Array<{ csv: string; index: string; from: string }> = [
  { csv: 'employees.csv', index: 'employees_test', from: 'employees' },
  { csv: 'airports.csv', index: 'airports_test', from: 'airports' },
  { csv: 'books.csv', index: 'books_test', from: 'books' },
  { csv: 'k8s.csv', index: 'k8s_test', from: 'k8s' },
  { csv: 'hosts.csv', index: 'hosts_test', from: 'hosts' },
  { csv: 'apps.csv', index: 'apps_test', from: 'apps' },
];

const TYPE_MAP: Record<string, MappingProperty> = {
  date: { type: 'date' },
  integer: { type: 'integer' },
  long: { type: 'long' },
  short: { type: 'short' },
  byte: { type: 'byte' },
  keyword: { type: 'keyword' },
  text: { type: 'text' },
  double: { type: 'double' },
  float: { type: 'float' },
  scaled_float: { type: 'scaled_float', scaling_factor: 100 },
  half_float: { type: 'half_float' },
  boolean: { type: 'boolean' },
  ip: { type: 'ip' },
};

const parseValue = (raw: string, type: string): unknown => {
  const value = raw.trim();
  if (value === '' || value === 'null') return null;

  // The fixture format writes multi-valued fields as [a,b,c].
  if (value.startsWith('[') && value.endsWith(']')) {
    return value
      .slice(1, -1)
      .split(',')
      .map((part) => parseValue(part, type))
      .filter((part) => part !== null);
  }

  switch (type) {
    case 'integer':
    case 'long':
    case 'short':
    case 'byte':
      return Number.parseInt(value, 10);
    case 'double':
    case 'float':
    case 'scaled_float':
    case 'half_float':
      return Number.parseFloat(value);
    case 'boolean':
      return value === 'true';
    default:
      return value;
  }
};

/** Load the configured Elasticsearch test datasets into the corpus cluster. */
export const loadEsTestData = async ({
  esClient,
  esRepo,
  log,
}: {
  esClient: EsClient;
  esRepo: string;
  log: ToolingLog;
}): Promise<void> => {
  for (const dataset of ES_TEST_DATASETS) {
    try {
      await loadOne({ esClient, esRepo, dataset, log });
    } catch (e) {
      log.warning(`[es-test-data] skipped ${dataset.csv}: ${(e as Error).message}`);
    }
  }
};

const loadOne = async ({
  esClient,
  esRepo,
  dataset,
  log,
}: {
  esClient: EsClient;
  esRepo: string;
  dataset: { csv: string; index: string };
  log: ToolingLog;
}): Promise<void> => {
  const csvPath = Path.join(
    esRepo,
    'x-pack/plugin/esql/qa/testFixtures/src/main/resources/data',
    dataset.csv
  );
  if (!Fs.existsSync(csvPath)) {
    throw new Error(`not found: ${csvPath}`);
  }

  const [header, ...rows] = Fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const columns = header.split(',').map((column) => {
    const [name, type = 'keyword'] = column.trim().split(':');
    return { name: name.trim(), type: type.trim() };
  });

  const properties: Record<string, MappingProperty> = {};
  for (const { name, type } of columns) {
    // The fixture encodes alternative types as sub-fields (`height.float`); one mapping per leaf
    // is enough for the queries that matter and avoids modelling multi-fields.
    if (name.includes('.')) continue;
    properties[name] = TYPE_MAP[type] ?? { type: 'keyword' };
  }

  await esClient.indices.delete({ index: dataset.index }, { ignore: [404] });
  await esClient.indices.create({ index: dataset.index, mappings: { properties } });

  const operations = rows.flatMap((row, index) => {
    const values = row.split(/,(?![^[]*\])/);
    const document: Record<string, unknown> = {};
    columns.forEach(({ name, type }, column) => {
      if (name.includes('.')) return;
      const value = parseValue(values[column] ?? '', type);
      if (value !== null) document[name] = value;
    });
    return [{ index: { _index: dataset.index, _id: `row-${index}` } }, document];
  });

  const response = await esClient.bulk({ operations, refresh: true });
  if (response.errors) {
    const firstError = response.items.find((item) => item.index?.error)?.index?.error;
    throw new Error(`[es-test-data] bulk failed: ${JSON.stringify(firstError)}`);
  }

  log.info(`[es-test-data] loaded ${rows.length} documents into ${dataset.index}`);
};
