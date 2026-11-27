/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { FilterManager } from '@kbn/data-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { CustomContentInteraction } from '@kbn/custom-content-renderer';
import { ON_APPLY_FILTER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { runInteraction } from './run_interaction';

const fields: FilterableField[] = [{ name: 'host.name', type: 'string', filterable: true }];
const source: FilterableSource = {
  id: 'logs',
  title: 'logs',
  fields,
  isTimeBased: () => false,
  getFieldByName: (name) => fields.find((field) => field.name === name),
};

describe('runInteraction', () => {
  it('runs a filter interaction through the apply filter trigger', async () => {
    const executeTriggerActions = jest.fn();
    await runInteraction(
      { action: 'filter', field: 'host.name', value: 'a', negate: false },
      {
        dataSources: [source],
        filterManager: { getAppFilters: () => [] } as unknown as FilterManager,
        uiActions: { executeTriggerActions } as unknown as UiActionsStart,
        embeddable: {},
      }
    );
    expect(executeTriggerActions).toHaveBeenCalledWith(ON_APPLY_FILTER, expect.any(Object));
  });

  it('refuses an action it has no handler for instead of ignoring it', async () => {
    const unknown = { action: 'navigate' } as unknown as CustomContentInteraction;
    await expect(
      runInteraction(unknown, {
        dataSources: undefined,
        filterManager: {} as FilterManager,
        uiActions: {} as UiActionsStart,
        embeddable: {},
      })
    ).rejects.toThrow('Unexpected object');
  });
});
