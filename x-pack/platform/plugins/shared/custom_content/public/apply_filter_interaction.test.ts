/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { Filter } from '@kbn/es-query';
import type { FilterManager } from '@kbn/data-plugin/public';
import { applyFilterInteraction, buildInteractionFilters } from './apply_filter_interaction';

interface FakeField {
  name: string;
  type: string;
  filterable: boolean;
  scripted?: boolean;
}

const createDataView = (id: string, fields: FakeField[]) =>
  ({
    id,
    getFieldByName: (name: string) => fields.find((field) => field.name === name),
  } as unknown as DataView);

const logs = createDataView('logs', [
  { name: 'host.name', type: 'string', filterable: true },
  { name: 'bytes', type: 'number', filterable: true },
  { name: 'message', type: 'string', filterable: false },
  { name: 'scripted', type: 'string', filterable: true, scripted: true },
]);
const metrics = createDataView('metrics', [{ name: 'cpu.id', type: 'string', filterable: true }]);

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
    dataViews: DataView[],
    appFilters: Filter[] = []
  ) => buildInteractionFilters(value, dataViews, createFilterManager(appFilters));

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

  it.each([' ', '0x10', '1e3', '-', '1.', 'Infinity'])(
    'does not coerce %p into a number for a number field',
    (value) => {
      expect(build(interaction('bytes', value), [logs])).toEqual([]);
    }
  );

  it.each(['message', 'scripted', 'missing'])('refuses %s', (field) => {
    expect(build(interaction(field, 'a'), [logs])).toEqual([]);
  });

  it('refuses when the panel has no data views', () => {
    expect(build(interaction('host.name', 'a'), [])).toEqual([]);
  });
});

describe('applyFilterInteraction', () => {
  const embeddable = { uuid: 'panel' };
  const createHost = (dataViews: DataView[] | undefined) => {
    const executeTriggerActions = jest.fn();
    const uiActions = { executeTriggerActions } as unknown as UiActionsStart;
    return {
      executeTriggerActions,
      host: { dataViews, filterManager: createFilterManager(), uiActions, embeddable },
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

  it('does nothing while the data views are not resolved yet', async () => {
    const { executeTriggerActions, host } = createHost(undefined);
    await applyFilterInteraction(interaction('host.name', 'a'), host);
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });
});
