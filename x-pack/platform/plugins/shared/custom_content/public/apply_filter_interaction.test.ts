/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import { fillTemplateDatasets } from '@kbn/custom-content-renderer';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { Filter } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';
import { applyFilterInteraction, buildInteractionFilters } from './apply_filter_interaction';

const createSource = (id: string, fields: FilterableField[]): FilterableSource => ({
  id,
  title: id,
  fields,
  isTimeBased: () => false,
});

const logs = createSource('logs', [
  { name: 'host.name', type: 'string', filterable: true },
  { name: 'bytes', type: 'number', filterable: true },
  { name: 'active', type: 'boolean', filterable: true },
  { name: 'message', type: 'string', filterable: false },
  { name: 'scripted', type: 'string', filterable: true, scripted: true },
]);
const metrics = createSource('metrics', [{ name: 'cpu.id', type: 'string', filterable: true }]);
// What an ES|QL dataset publishes: no data view behind it, only an id and filterable fields.
const esqlDataset: FilterableSource = {
  ...createSource('esql-logs', [{ name: 'host.name', type: 'string', filterable: true }]),
  kind: 'esql',
};

const interaction = (field: string, value: string, negate = false) => ({
  action: 'filter' as const,
  field,
  value,
  negate,
});

const createFilterManager = (appFilters: Filter[] = []) =>
  ({ getAppFilters: () => appFilters } as unknown as FilterManager);

describe('buildInteractionFilters', () => {
  const build = (
    value: ReturnType<typeof interaction>,
    dataSources: FilterableSource[],
    appFilters: Filter[] = []
  ) => buildInteractionFilters(value, dataSources, createFilterManager(appFilters));

  it('builds a phrase filter bound to the data view that has the field', () => {
    const [filter] = build(interaction('cpu.id', '3'), [logs, metrics]);
    expect(filter).toMatchObject({
      meta: { index: 'metrics', negate: false },
      query: { match_phrase: { 'cpu.id': '3' } },
    });
  });

  it('negates for is_not', () => {
    const [filter] = build(interaction('host.name', 'a', true), [logs]);
    expect(filter.meta.negate).toBe(true);
  });

  it('flips a filter that is already on the dashboard instead of adding a contradicting one', () => {
    const [existing] = build(interaction('host.name', 'a'), [logs]);
    const [result] = build(interaction('host.name', 'a', true), [logs], [existing]);
    expect(result).toBe(existing);
    expect(existing.meta.negate).toBe(true);
  });

  it('sends numbers as numbers and drops a non-numeric value for a number field', () => {
    expect(build(interaction('bytes', '10'), [logs])[0].query).toEqual({
      match_phrase: { bytes: 10 },
    });
    expect(build(interaction('bytes', 'ten'), [logs])).toEqual([]);
  });

  it.each([' ', '0x10', '1e', '1e999'])(
    'does not coerce %p into a number for a number field',
    (value) => {
      expect(build(interaction('bytes', value), [logs])).toEqual([]);
    }
  );

  it.each([
    ['1e-7', 1e-7],
    ['-1.2e+21', -1.2e21],
    ['12.5', 12.5],
  ])('accepts the number %s as Liquid prints it', (value, expected) => {
    expect(build(interaction('bytes', value), [logs])[0].query).toEqual({
      match_phrase: { bytes: expected },
    });
  });

  it('filters on a number that a template renders as scientific notation', async () => {
    // The path of a click: a cell goes through Liquid into the attribute, and the host reads it back.
    const html = await fillTemplateDatasets(
      '<button data-cc-value="{{ rows[0].bytes.value }}"></button>',
      [{ columns: [{ name: 'bytes', type: 'double' }], rows: [[0.0000001]] }]
    );
    const rendered = new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector('button')
      ?.getAttribute('data-cc-value');
    expect(rendered).toBe('1e-7');
    expect(build(interaction('bytes', rendered!), [logs])[0].query).toEqual({
      match_phrase: { bytes: 1e-7 },
    });
  });

  it('uses the first source that can take the value when several have the field', () => {
    const numericStatus = createSource('numbers', [
      { name: 'status', type: 'number', filterable: true },
    ]);
    const keywordStatus = createSource('keywords', [
      { name: 'status', type: 'string', filterable: true },
    ]);
    const [filter] = build(interaction('status', 'ok'), [numericStatus, keywordStatus]);
    expect(filter.meta.index).toBe('keywords');
    expect(build(interaction('status', '5'), [numericStatus, keywordStatus])[0].meta.index).toBe(
      'numbers'
    );
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('sends %s as the boolean a click on a chart would use', (value, expected) => {
    expect(build(interaction('active', value), [logs])[0].query).toEqual({
      match_phrase: { active: expected },
    });
  });

  it('drops text that is not a boolean instead of failing', () => {
    expect(build(interaction('active', 'maybe'), [logs])).toEqual([]);
  });

  it('flips a boolean filter that is already on the dashboard', () => {
    const [existing] = build(interaction('active', 'true'), [logs]);
    const [result] = build(interaction('active', 'true', true), [logs], [existing]);
    expect(result).toBe(existing);
    expect(existing.meta.negate).toBe(true);
  });

  it.each(['message', 'scripted', 'missing'])('refuses %s', (field) => {
    expect(build(interaction(field, 'a'), [logs])).toEqual([]);
  });

  it('builds a filter on an ES|QL dataset, bound to the dataset id', () => {
    const [filter] = build(interaction('host.name', 'a'), [esqlDataset]);
    expect(filter).toMatchObject({
      meta: { index: 'esql-logs' },
      query: { match_phrase: { 'host.name': 'a' } },
    });
  });

  it('refuses when the panel has no data sources', () => {
    expect(build(interaction('host.name', 'a'), [])).toEqual([]);
  });
});

describe('applyFilterInteraction', () => {
  const embeddable = { uuid: 'panel' };
  const createHost = (dataSources: FilterableSource[] | undefined) => {
    const executeTriggerActions = jest.fn();
    const uiActions = { executeTriggerActions } as unknown as UiActionsStart;
    return {
      executeTriggerActions,
      host: { dataSources, filterManager: createFilterManager(), uiActions, embeddable },
    };
  };

  it('executes the apply filter trigger with the panel as the source', async () => {
    const { executeTriggerActions, host } = createHost([logs]);
    await applyFilterInteraction(interaction('host.name', 'a'), host);
    expect(executeTriggerActions).toHaveBeenCalledWith(ON_APPLY_FILTER, {
      filters: [
        expect.objectContaining({
          meta: expect.objectContaining({ index: 'logs' }),
          query: { match_phrase: { 'host.name': 'a' } },
        }),
      ],
      embeddable,
    });
  });

  it('does nothing when no filter can be built', async () => {
    const { executeTriggerActions, host } = createHost([logs]);
    await applyFilterInteraction(interaction('missing', 'a'), host);
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });

  it('does nothing while the data sources are not resolved yet', async () => {
    const { executeTriggerActions, host } = createHost(undefined);
    await applyFilterInteraction(interaction('host.name', 'a'), host);
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });
});
