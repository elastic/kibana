/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FieldRulesPanelHeader } from './header';
import { useFieldRulesPanelContext } from './context';

jest.mock('./context', () => ({
  useFieldRulesPanelContext: jest.fn(),
}));

describe('FieldRulesPanelHeader', () => {
  it('renders rule policy counters', () => {
    jest.mocked(useFieldRulesPanelContext).mockReturnValue({
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
      selectedCount: 0,
      toggleSelectAllFields: jest.fn(),
      onRuleActionChange: jest.fn(),
      onRuleEntityClassChange: jest.fn(),
      applyBulkAction: jest.fn(),
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
