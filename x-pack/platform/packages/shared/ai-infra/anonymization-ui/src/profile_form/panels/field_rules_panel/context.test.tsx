/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { renderHook } from '@testing-library/react';
import { FieldRulesPanelContextProvider, useFieldRulesPanelContext } from './context';

const contextValue = {
  fieldSearchQuery: '',
  setFieldSearchQuery: vi.fn(),
  fieldActionFilter: 'all' as const,
  setFieldActionFilter: vi.fn(),
  fieldPageIndex: 0,
  setFieldPageIndex: vi.fn(),
  bulkAction: 'allow' as const,
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
};

describe('field rules panel context', () => {
  it('throws when hook is used outside provider', () => {
    expect(() => renderHook(() => useFieldRulesPanelContext())).toThrow(
      'useFieldRulesPanelContext must be used within FieldRulesPanelContextProvider'
    );
  });

  it('returns context value when hook is inside provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FieldRulesPanelContextProvider value={contextValue}>
        {children}
      </FieldRulesPanelContextProvider>
    );

    const { result } = renderHook(() => useFieldRulesPanelContext(), { wrapper });
    expect(result.current.bulkAction).toBe('allow');
    expect(result.current.policyCounters).toEqual({ allow: 0, anonymize: 0, deny: 0 });
  });
});
