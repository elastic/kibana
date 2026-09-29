/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FieldRulesPanelFilters } from './filters';
import { useFieldRulesPanelContext } from './context';

vi.mock('./context', () => {
  const mocked = {
    useFieldRulesPanelContext: vi.fn(),
  };
  return { ...mocked, default: mocked };
});

describe('FieldRulesPanelFilters', () => {
  it('updates search query and resets page index', () => {
    const setFieldSearchQuery = vi.fn();
    const setFieldPageIndex = vi.fn();
    vi.mocked(useFieldRulesPanelContext).mockReturnValue({
      fieldSearchQuery: '',
      setFieldSearchQuery,
      fieldActionFilter: 'all',
      setFieldActionFilter: vi.fn(),
      fieldPageIndex: 0,
      setFieldPageIndex,
      bulkAction: 'allow',
      setBulkAction: vi.fn(),
      bulkEntityClass: '',
      setBulkEntityClass: vi.fn(),
      pagedRules: [],
      filteredRules: [],
      allRules: [],
      selectedFields: [],
      setSelectedFields: vi.fn(),
      allFieldsSelected: false,
      hasActiveFieldFilters: false,
      selectedCount: 0,
      toggleSelectAllFields: vi.fn(),
      onRuleActionChange: vi.fn(),
      onRuleEntityClassChange: vi.fn(),
      applyBulkAction: vi.fn(),
      policyCounters: { allow: 0, anonymize: 0, deny: 0 },
      isManageMode: true,
      isSubmitting: false,
    });

    render(<FieldRulesPanelFilters />);
    fireEvent.change(screen.getByLabelText('Search field rules'), {
      target: { value: 'host' },
    });

    expect(setFieldSearchQuery).toHaveBeenCalledWith('host');
    expect(setFieldPageIndex).toHaveBeenCalledWith(0);
  });

  it('updates action filter and resets page index', () => {
    const setFieldActionFilter = vi.fn();
    const setFieldPageIndex = vi.fn();
    vi.mocked(useFieldRulesPanelContext).mockReturnValue({
      fieldSearchQuery: '',
      setFieldSearchQuery: vi.fn(),
      fieldActionFilter: 'all',
      setFieldActionFilter,
      fieldPageIndex: 1,
      setFieldPageIndex,
      bulkAction: 'allow',
      setBulkAction: vi.fn(),
      bulkEntityClass: '',
      setBulkEntityClass: vi.fn(),
      pagedRules: [],
      filteredRules: [],
      allRules: [],
      selectedFields: [],
      setSelectedFields: vi.fn(),
      allFieldsSelected: false,
      hasActiveFieldFilters: false,
      selectedCount: 0,
      toggleSelectAllFields: vi.fn(),
      onRuleActionChange: vi.fn(),
      onRuleEntityClassChange: vi.fn(),
      applyBulkAction: vi.fn(),
      policyCounters: { allow: 0, anonymize: 0, deny: 0 },
      isManageMode: true,
      isSubmitting: false,
    });

    render(<FieldRulesPanelFilters />);
    fireEvent.change(screen.getByLabelText('Select field rule action filter'), {
      target: { value: 'deny' },
    });

    expect(setFieldActionFilter).toHaveBeenCalledWith('deny');
    expect(setFieldPageIndex).toHaveBeenCalledWith(0);
  });
});
