/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FIELD_RULE_ACTION_ANONYMIZE } from '../../hooks/field_rule_actions';
import { FieldRulesPanelBulkActions } from './bulk_actions';
import { useFieldRulesPanelContext } from './context';

jest.mock('./context', () => ({
  useFieldRulesPanelContext: jest.fn(),
}));

const createContextValue = (
  overrides: Partial<ReturnType<typeof useFieldRulesPanelContext>> = {}
) =>
  ({
    fieldSearchQuery: '',
    setFieldSearchQuery: jest.fn(),
    fieldActionFilter: 'all',
    setFieldActionFilter: jest.fn(),
    fieldPageIndex: 0,
    setFieldPageIndex: jest.fn(),
    bulkAction: 'allow',
    setBulkAction: jest.fn(),
    bulkEntityClass: '',
    setBulkEntityClass: jest.fn(),
    pagedRules: [],
    filteredRules: [],
    allRules: [],
    selectedFields: [],
    setSelectedFields: jest.fn(),
    allFieldsSelected: false,
    hasActiveFieldFilters: false,
    selectedCount: 2,
    toggleSelectAllFields: jest.fn(),
    onRuleActionChange: jest.fn(),
    onRuleEntityClassChange: jest.fn(),
    applyBulkAction: jest.fn(),
    policyCounters: { allow: 0, anonymize: 0, deny: 0 },
    isManageMode: true,
    isSubmitting: false,
    ...overrides,
  } as ReturnType<typeof useFieldRulesPanelContext>);

describe('FieldRulesPanelBulkActions', () => {
  it('applies selected action and entity class updates', () => {
    const setBulkAction = jest.fn();
    const setBulkEntityClass = jest.fn();
    const applyBulkAction = jest.fn();
    jest.mocked(useFieldRulesPanelContext).mockReturnValue(
      createContextValue({
        setBulkAction,
        setBulkEntityClass,
        applyBulkAction,
      })
    );

    render(<FieldRulesPanelBulkActions />);

    fireEvent.change(screen.getByLabelText('Bulk policy action'), {
      target: { value: FIELD_RULE_ACTION_ANONYMIZE },
    });
    fireEvent.change(screen.getByLabelText('Bulk entity class'), {
      target: { value: 'HOST_NAME' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to selected' }));

    expect(setBulkAction).toHaveBeenCalledWith(FIELD_RULE_ACTION_ANONYMIZE);
    expect(setBulkEntityClass).toHaveBeenCalledWith('HOST_NAME');
    expect(applyBulkAction).toHaveBeenCalledTimes(1);
  });

  it('disables apply button when no rows are selected', () => {
    jest.mocked(useFieldRulesPanelContext).mockReturnValue(
      createContextValue({
        selectedCount: 0,
      })
    );

    render(<FieldRulesPanelBulkActions />);

    const applyButton = screen.getByRole('button', { name: 'Apply to selected' });
    expect((applyButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('disables bulk controls when form is not editable', () => {
    jest.mocked(useFieldRulesPanelContext).mockReturnValue(
      createContextValue({
        isManageMode: false,
      })
    );

    render(<FieldRulesPanelBulkActions />);

    expect((screen.getByLabelText('Bulk policy action') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('Bulk entity class') as HTMLSelectElement).disabled).toBe(true);
    expect(
      (screen.getByRole('button', { name: 'Apply to selected' }) as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
