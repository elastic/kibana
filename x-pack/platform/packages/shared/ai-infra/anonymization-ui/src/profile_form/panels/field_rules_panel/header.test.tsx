/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FieldRulesPanelHeader } from './header';
import { useFieldRulesPanelContext } from './context';

vi.mock('./context', () => {
      const mocked = {
      useFieldRulesPanelContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('FieldRulesPanelHeader', () => {
  it('renders rule policy counters', () => {
    vi.mocked(useFieldRulesPanelContext).mockReturnValue({
      fieldSearchQuery: '',
      setFieldSearchQuery: vi.fn(),
      fieldActionFilter: 'all',
      setFieldActionFilter: vi.fn(),
      fieldPageIndex: 0,
      setFieldPageIndex: vi.fn(),
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
      policyCounters: { allow: 10, anonymize: 3, deny: 2 },
      isManageMode: true,
      isSubmitting: false,
    });

    render(<FieldRulesPanelHeader />);

    expect(screen.getByText('Field policy rules')).toBeTruthy();
    expect(screen.getByText('Allowed')).toBeTruthy();
    expect(screen.getByText('Anonymized')).toBeTruthy();
    expect(screen.getByText('Denied')).toBeTruthy();
    expect(screen.getByText('10')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
