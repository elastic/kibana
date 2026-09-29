/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FIELD_PAGE_SIZE } from '../../constants';
import { FieldRulesPanelPagination } from './pagination';
import { useFieldRulesPanelContext } from './context';

vi.mock('./context', () => {
      const mocked = {
      useFieldRulesPanelContext: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const createRules = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    field: `field-${index}`,
    allowed: true,
    anonymized: false,
  }));

describe('FieldRulesPanelPagination', () => {
  it('does not render pagination when all rules fit one page', () => {
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
      filteredRules: createRules(FIELD_PAGE_SIZE),
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

    const { container } = render(<FieldRulesPanelPagination />);
    expect(container.firstChild).toBeNull();
  });

  it('renders pagination summary when rules span multiple pages', () => {
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
      filteredRules: createRules(FIELD_PAGE_SIZE + 1),
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

    render(<FieldRulesPanelPagination />);

    expect(screen.getByText(`${FIELD_PAGE_SIZE + 1} rules total`)).toBeTruthy();
  });
});
