/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/response-ops-alerts-table/types';
import { getRemoveFromCaseActions } from './remove_from_case_actions';

const toAlerts = (ids: string[]): TimelineItem[] =>
  ids.map((_id) => ({ _id, data: [], ecs: { _id } }));

describe('getRemoveFromCaseActions', () => {
  const key = 'remove-alerts-from-case';
  const label = 'Remove from case';

  it('returns nothing without onRemove', () => {
    expect(getRemoveFromCaseActions({ onRemove: undefined, key, label })).toBeUndefined();
  });

  it('builds a bulk action that is disabled on "select all"', () => {
    const { bulkAction } = getRemoveFromCaseActions({ onRemove: jest.fn(), key, label }) ?? {};

    expect(bulkAction).toEqual(
      expect.objectContaining({
        key,
        label,
        icon: 'trash',
        groupId: 'caseRemoval',
        'data-test-subj': key,
        disableOnQuery: true,
      })
    );
  });

  it('removes the selected rows and clears the selection on success', () => {
    const onRemove = jest.fn();
    const clearSelection = jest.fn();
    const { bulkAction } = getRemoveFromCaseActions({ onRemove, key, label }) ?? {};

    bulkAction?.onClick?.(
      toAlerts(['alert-1', 'alert-2']),
      false,
      jest.fn(),
      clearSelection,
      jest.fn()
    );

    expect(onRemove).toHaveBeenCalledWith(
      { attachmentIds: ['alert-1', 'alert-2'] },
      { onSuccess: clearSelection }
    );
  });

  it('removes a single row', () => {
    const onRemove = jest.fn();
    const { onRemoveFromCase } = getRemoveFromCaseActions({ onRemove, key, label }) ?? {};

    onRemoveFromCase?.('alert-1');

    expect(onRemove).toHaveBeenCalledWith({ attachmentIds: ['alert-1'] });
  });
});
