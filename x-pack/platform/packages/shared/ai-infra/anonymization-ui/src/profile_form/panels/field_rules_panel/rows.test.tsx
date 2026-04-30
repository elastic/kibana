/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FieldRulesPanelRows } from './rows';
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
    pagedRules: [{ field: 'host.name', allowed: true, anonymized: false }],
    filteredRules: [{ field: 'host.name', allowed: true, anonymized: false }],
    allRules: [{ field: 'host.name', allowed: true, anonymized: false }],
    selectedFields: [],
    setSelectedFields: jest.fn(),
    allFieldsSelected: false,
    hasActiveFieldFilters: false,
    selectedCount: 0,
    toggleSelectAllFields: jest.fn(),
    onRuleActionChange: jest.fn(),
    onRuleEntityClassChange: jest.fn(),
    applyBulkAction: jest.fn(),
    policyCounters: { allow: 1, anonymize: 0, deny: 0 },
    validationError: undefined,
    selectedTargetName: undefined,
    isManageMode: true,
    isSubmitting: false,
    ...overrides,
  } as ReturnType<typeof useFieldRulesPanelContext>);

describe('FieldRulesPanelRows', () => {
  it('shows "Select all fields" when no filters are active', () => {
    jest.mocked(useFieldRulesPanelContext).mockReturnValue(createContextValue());

    render(<FieldRulesPanelRows />);

    expect(screen.getByLabelText('Select all fields')).toBeTruthy();
  });

  it('shows "Select all matching fields" when filters are active', () => {
    jest.mocked(useFieldRulesPanelContext).mockReturnValue(
      createContextValue({
        hasActiveFieldFilters: true,
        fieldSearchQuery: 'name',
      })
    );

    render(<FieldRulesPanelRows />);

    expect(screen.getByLabelText('Select all matching fields')).toBeTruthy();
  });
});
