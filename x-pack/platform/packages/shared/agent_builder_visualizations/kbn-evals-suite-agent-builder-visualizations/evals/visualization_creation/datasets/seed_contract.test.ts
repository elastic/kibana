/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { collectColumnBindings } from '../../../src/evaluators/column_binding_integrity';
import type { ExtractedVisualization } from '../../../src/extract_visualization';
import { extractGoldQuery } from '../../../src/evaluators/gold_visualization_config';
import { HOST_METRICS_INDEX, buildHostLoadEvents } from '../../../src/fixtures/host_load_metrics';
import type { DataSource } from './factories';
import {
  VISUALIZATION_CREATION_EXAMPLES,
  VISUALIZATION_EDIT_EXAMPLES,
  VISUALIZATION_REFUSAL_EXAMPLES,
} from '.';

/**
 * Contract between the dataset and the data it runs against. Catches a gold
 * that points at an index the fixtures never create, a column binding that
 * the gold query never produces, or a host-load field the synthtrace fixture
 * does not write, before a model run turns it into a confusing 0.
 */
const INDEX_BY_DATA_SOURCE: Record<DataSource, string> = {
  logs: 'kibana_sample_data_logs',
  ecommerce: 'kibana_sample_data_ecommerce',
  host_metrics: HOST_METRICS_INDEX,
};

const fromTarget = (query: string): string | undefined =>
  /^FROM\s+(\S+)/m.exec(query)?.[1]?.replace(/,$/, '');

const stripBackticks = (value: string): string => value.replace(/`/g, '');

const describeExample = (question: string) => question.slice(0, 60);

describe('visualization creation dataset contract', () => {
  const examples = [...VISUALIZATION_CREATION_EXAMPLES, ...VISUALIZATION_EDIT_EXAMPLES];

  it('has unique prompts within each dataset', () => {
    for (const dataset of [VISUALIZATION_CREATION_EXAMPLES, VISUALIZATION_EDIT_EXAMPLES]) {
      const prompts = dataset.map((example) =>
        [example.input?.question, example.input?.followUp].join(' / ')
      );
      expect(new Set(prompts).size).toBe(prompts.length);
    }
  });

  it('marks every edit example as multi-turn with a follow-up', () => {
    for (const example of VISUALIZATION_EDIT_EXAMPLES) {
      expect(example.input?.followUp).toEqual(expect.any(String));
      expect(example.metadata?.multiTurn).toBe(true);
    }
  });

  it.each(examples.map((example) => [describeExample(example.input?.question ?? ''), example]))(
    '%s: is tagged, has a gold query, and targets its data source index',
    (_, example) => {
      const metadata = example.metadata ?? {};
      expect(metadata.chartFamily).toEqual(expect.any(String));
      expect(metadata.dataSource).toEqual(expect.any(String));
      expect(example.output?.goldenToolPath).toEqual(
        expect.arrayContaining(['platform.core.create_visualization'])
      );

      const query = extractGoldQuery(example.output);
      expect(query).not.toBe('');
      expect(fromTarget(query)).toBe(INDEX_BY_DATA_SOURCE[metadata.dataSource as DataSource]);
    }
  );

  it.each(examples.map((example) => [describeExample(example.input?.question ?? ''), example]))(
    '%s: binds only columns its gold query produces',
    (_, example) => {
      const config = example.output?.config ?? {};
      const query = extractGoldQuery(example.output);
      const isVega = 'spec' in config;
      const visualization = isVega
        ? { spec: JSON.stringify(config.spec) }
        : (config as ExtractedVisualization['visualization']);
      const bindings = collectColumnBindings({
        esql: query,
        renderer: isVega ? 'vega' : 'lens',
        visualization,
      });

      for (const binding of bindings) {
        expect(stripBackticks(query)).toContain(stripBackticks(binding.column));
      }
    }
  );

  it('references only fields the synthtrace host-load fixture writes', () => {
    const [doc] = buildHostLoadEvents({ count: 1 })[0].serialize();
    const systemLoad = doc['system.load'] as Record<string, unknown>;

    const hostExamples = examples.filter(
      (example) => example.metadata?.dataSource === 'host_metrics'
    );
    expect(hostExamples.length).toBeGreaterThan(0);

    for (const example of hostExamples) {
      const query = extractGoldQuery(example.output);
      const loadFields = Array.from(query.matchAll(/system\.load\.(\d+)/g), (match) => match[1]);
      expect(loadFields.length).toBeGreaterThan(0);
      for (const field of loadFields) {
        expect(systemLoad).toHaveProperty(field);
      }
      expect(doc).toHaveProperty('@timestamp');
    }
  });
});

describe('visualization refusal dataset contract', () => {
  it('declares a refusal reason and no gold config on every negative example', () => {
    expect(VISUALIZATION_REFUSAL_EXAMPLES.length).toBeGreaterThan(0);
    for (const example of VISUALIZATION_REFUSAL_EXAMPLES) {
      expect(example.output?.refusal?.reason).toEqual(expect.any(String));
      expect(example.output?.config).toBeUndefined();
      expect(example.metadata?.chartFamily).toBe('refusal');
    }
  });

  it('keeps negative questions disjoint from positive ones', () => {
    const positive = new Set(VISUALIZATION_CREATION_EXAMPLES.map((e) => e.input?.question));
    for (const example of VISUALIZATION_REFUSAL_EXAMPLES) {
      expect(positive.has(example.input?.question)).toBe(false);
    }
  });
});
