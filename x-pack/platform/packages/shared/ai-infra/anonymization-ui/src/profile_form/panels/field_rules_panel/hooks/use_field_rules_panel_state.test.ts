/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react';
import type { FieldRule } from '@kbn/anonymization-common';
import {
  FIELD_RULE_ACTION_ANONYMIZE,
  FIELD_RULE_ACTION_DENY,
} from '../../../hooks/field_rule_actions';
import { useFieldRulesPanelState } from './use_field_rules_panel_state';

const baseRules: FieldRule[] = [
  { field: 'alpha.field', allowed: true, anonymized: false, entityClass: undefined },
  { field: 'event.action', allowed: true, anonymized: false, entityClass: undefined },
  { field: 'host.name', allowed: true, anonymized: false, entityClass: undefined },
  { field: 'user.email', allowed: true, anonymized: true, entityClass: 'EMAIL' },
];

describe('useFieldRulesPanelState', () => {
  it('filters rows by search query', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    act(() => {
      result.current.setFieldSearchQuery('host');
    });

    expect(result.current.filteredRules).toHaveLength(1);
    expect(result.current.filteredRules[0].field).toBe('host.name');
  });

  it('orders filtered rows by ranking (query relevance, ECS boost, alphabetical fallback)', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    expect(result.current.filteredRules.map((rule) => rule.field)).toEqual([
      'event.action',
      'host.name',
      'user.email',
      'alpha.field',
    ]);
    expect(result.current.pagedRules.map((rule) => rule.field)).toEqual([
      'event.action',
      'host.name',
      'user.email',
      'alpha.field',
    ]);
  });

  it('toggles select all matching fields when filters are active', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    act(() => {
      result.current.setFieldActionFilter(FIELD_RULE_ACTION_ANONYMIZE);
    });

    expect(result.current.filteredRules).toHaveLength(1);
    expect(result.current.hasActiveFieldFilters).toBe(true);
    expect(result.current.selectedCount).toBe(0);

    act(() => {
      result.current.toggleSelectAllFields();
    });

    expect(result.current.selectedCount).toBe(1);
    expect(result.current.selectedFields).toEqual(['user.email']);
    expect(result.current.allFieldsSelected).toBe(true);

    act(() => {
      result.current.toggleSelectAllFields();
    });

    expect(result.current.selectedCount).toBe(0);
    expect(result.current.selectedFields).toEqual([]);
  });

  it('toggles select all fields across all rules when no filters are active', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    expect(result.current.hasActiveFieldFilters).toBe(false);
    act(() => {
      result.current.toggleSelectAllFields();
    });

    expect(result.current.selectedCount).toBe(4);
    expect(new Set(result.current.selectedFields)).toEqual(
      new Set(['alpha.field', 'event.action', 'host.name', 'user.email'])
    );
  });

  it('applies bulk action to selected rows only', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    act(() => {
      result.current.setSelectedFields(['host.name']);
      result.current.setBulkAction(FIELD_RULE_ACTION_ANONYMIZE);
      result.current.setBulkEntityClass('HOST_NAME');
    });

    act(() => {
      result.current.applyBulkAction();
    });

    const nextRules = onFieldRulesChange.mock.calls[0][0] as FieldRule[];
    const hostRule = nextRules.find((rule) => rule.field === 'host.name');
    const userRule = nextRules.find((rule) => rule.field === 'user.email');
    expect(hostRule).toMatchObject({ allowed: true, anonymized: true, entityClass: 'HOST_NAME' });
    expect(userRule).toMatchObject({ allowed: true, anonymized: true, entityClass: 'EMAIL' });
  });

  it('keeps existing entity class when clearing with invalid value', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    act(() => {
      result.current.onRuleEntityClassChange('user.email', '');
    });

    const nextRules = onFieldRulesChange.mock.calls[0][0] as FieldRule[];
    const userRule = nextRules.find((rule) => rule.field === 'user.email');
    expect(userRule).toMatchObject({ allowed: true, anonymized: true, entityClass: 'EMAIL' });
  });

  it('suggests entity class when toggling field to anonymize', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    act(() => {
      result.current.onRuleActionChange('host.name', FIELD_RULE_ACTION_ANONYMIZE);
    });

    const nextRules = onFieldRulesChange.mock.calls[0][0] as FieldRule[];
    const hostRule = nextRules.find((rule) => rule.field === 'host.name');
    expect(hostRule).toMatchObject({ allowed: true, anonymized: true, entityClass: 'HOST_NAME' });
  });

  it('falls back to MISC when suggestion is unavailable', () => {
    const onFieldRulesChange = jest.fn();
    const rules: FieldRule[] = [
      { field: 'custom.field', allowed: true, anonymized: false, entityClass: undefined },
    ];

    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: rules,
        onFieldRulesChange,
      })
    );

    act(() => {
      result.current.onRuleActionChange('custom.field', FIELD_RULE_ACTION_ANONYMIZE);
    });

    const nextRules = onFieldRulesChange.mock.calls[0][0] as FieldRule[];
    expect(nextRules[0]).toMatchObject({ allowed: true, anonymized: true, entityClass: 'MISC' });
  });

  it('reports counters for allow/anonymize/deny', () => {
    const onFieldRulesChange = jest.fn();
    const { result } = renderHook(() =>
      useFieldRulesPanelState({
        fieldRules: baseRules,
        onFieldRulesChange,
      })
    );

    expect(result.current.policyCounters).toEqual({
      allow: 3,
      anonymize: 1,
      deny: 0,
    });

    act(() => {
      result.current.onRuleActionChange('host.name', FIELD_RULE_ACTION_DENY);
    });
    const nextRules = onFieldRulesChange.mock.calls[0][0] as FieldRule[];
    const denyCount = nextRules.filter((rule) => !rule.allowed).length;
    const anonymizeCount = nextRules.filter((rule) => rule.allowed && rule.anonymized).length;
    const allowCount = nextRules.filter((rule) => rule.allowed && !rule.anonymized).length;
    expect({ allow: allowCount, anonymize: anonymizeCount, deny: denyCount }).toEqual({
      allow: 2,
      anonymize: 1,
      deny: 1,
    });
  });
});
