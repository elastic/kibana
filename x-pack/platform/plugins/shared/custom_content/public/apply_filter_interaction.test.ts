/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { applyFilterInteraction, buildInteractionFilter } from './apply_filter_interaction';

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

describe('buildInteractionFilter', () => {
  it('builds a phrase filter bound to the data view that has the field', () => {
    expect(buildInteractionFilter(interaction('cpu.id', '3'), [logs, metrics])).toEqual({
      meta: { index: 'metrics' },
      query: { match_phrase: { 'cpu.id': '3' } },
    });
  });

  it('negates for is_not', () => {
    const filter = buildInteractionFilter(interaction('host.name', 'a', true), [logs]);
    expect(filter?.meta.negate).toBe(true);
  });

  it('sends numbers as numbers and drops a non-numeric value for a number field', () => {
    expect(buildInteractionFilter(interaction('bytes', '10'), [logs])?.query).toEqual({
      match_phrase: { bytes: 10 },
    });
    expect(buildInteractionFilter(interaction('bytes', 'ten'), [logs])).toBeUndefined();
  });

  it.each([' ', '0x10', '1e3', '-', '1.', 'Infinity'])(
    'does not coerce %p into a number for a number field',
    (value) => {
      expect(buildInteractionFilter(interaction('bytes', value), [logs])).toBeUndefined();
    }
  );

  it.each(['message', 'scripted', 'missing'])('refuses %s', (field) => {
    expect(buildInteractionFilter(interaction(field, 'a'), [logs])).toBeUndefined();
  });

  it('refuses when the panel has no data views', () => {
    expect(buildInteractionFilter(interaction('host.name', 'a'), [])).toBeUndefined();
  });
});

describe('applyFilterInteraction', () => {
  const embeddable = { uuid: 'panel' };

  it('executes the apply filter trigger with the panel as the source', async () => {
    const executeTriggerActions = jest.fn();
    const uiActions = { executeTriggerActions } as unknown as UiActionsStart;
    await applyFilterInteraction({
      interaction: interaction('host.name', 'a'),
      dataViews: [logs],
      uiActions,
      embeddable,
    });
    expect(executeTriggerActions).toHaveBeenCalledWith(ON_APPLY_FILTER, {
      filters: [{ meta: { index: 'logs' }, query: { match_phrase: { 'host.name': 'a' } } }],
      embeddable,
    });
  });

  it('does nothing when no filter can be built', async () => {
    const executeTriggerActions = jest.fn();
    const uiActions = { executeTriggerActions } as unknown as UiActionsStart;
    await applyFilterInteraction({
      interaction: interaction('missing', 'a'),
      dataViews: [logs],
      uiActions,
      embeddable,
    });
    expect(executeTriggerActions).not.toHaveBeenCalled();
  });
});
