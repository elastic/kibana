/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, render, renderHook, screen } from '@testing-library/react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import type { FlyoutFooterMenuItem } from '@kbn/flyout-template';
import { I18nProvider } from '@kbn/i18n-react';
import React from 'react';
import type { UseActionPolicyMenuParams } from './use_action_policy_menu';
import { useActionPolicyMenu } from './use_action_policy_menu';

let mockIsLicenseValid = true;
jest.mock('../../hooks/use_is_action_policies_license_valid', () => ({
  useIsActionPoliciesLicenseValid: () => mockIsLicenseValid,
}));

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  name: 'Test policy',
  description: '',
  enabled: true,
  destinations: [],
  created_by: { profile_uid: 'elastic' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: { profile_uid: 'elastic' },
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const renderMenuHook = (params: Partial<UseActionPolicyMenuParams> = {}) => {
  const props: UseActionPolicyMenuParams = {
    policy: createPolicy(),
    onClone: jest.fn(),
    onDelete: jest.fn(),
    onUpdateApiKey: jest.fn(),
    ...params,
  };
  const hook = renderHook(() => useActionPolicyMenu(props));
  return { ...hook, props };
};

const getItems = (result: { current: ReturnType<typeof useActionPolicyMenu> }) =>
  result.current.panels[0].items;

const findItem = (items: FlyoutFooterMenuItem[], testSubj: string) =>
  items.find((item) => 'data-test-subj' in item && item['data-test-subj'] === testSubj) as
    | (FlyoutFooterMenuItem & {
        onClick?: () => void;
        disabled?: boolean;
        toolTipContent?: unknown;
      })
    | undefined;

describe('useActionPolicyMenu', () => {
  beforeEach(() => {
    mockIsLicenseValid = true;
  });

  it('returns a single panel with policy-scoped test subjects', () => {
    const { result } = renderMenuHook({
      onViewDetails: jest.fn(),
      onEdit: jest.fn(),
      onEnable: jest.fn(),
      onDisable: jest.fn(),
    });

    expect(result.current.panels).toHaveLength(1);
    const testSubjects = getItems(result)
      .filter((item) => 'data-test-subj' in item)
      .map((item) => (item as { 'data-test-subj': string })['data-test-subj']);
    expect(testSubjects).toEqual([
      'viewDetailsActionPolicy-policy-1',
      'editActionPolicy-policy-1',
      'cloneActionPolicy-policy-1',
      'toggleEnabledActionPolicy-policy-1',
      'updateApiKeyActionPolicy-policy-1',
      'deleteActionPolicy-policy-1',
    ]);
  });

  it('separates the three groups and skips separators around empty groups', () => {
    const withAllGroups = renderMenuHook({ onEdit: jest.fn() }).result;
    expect(getItems(withAllGroups).filter((item) => 'isSeparator' in item)).toHaveLength(2);

    const withoutFirstGroup = renderMenuHook().result;
    expect(getItems(withoutFirstGroup)[0]).not.toHaveProperty('isSeparator');
    expect(getItems(withoutFirstGroup).filter((item) => 'isSeparator' in item)).toHaveLength(1);
  });

  it('disables license-gated items with a tooltip when the license is not valid', () => {
    mockIsLicenseValid = false;
    const { result } = renderMenuHook({
      policy: createPolicy({ enabled: false }),
      onEdit: jest.fn(),
      onEnable: jest.fn(),
      onDisable: jest.fn(),
    });
    const items = getItems(result);

    for (const testSubj of [
      'editActionPolicy-policy-1',
      'cloneActionPolicy-policy-1',
      'toggleEnabledActionPolicy-policy-1',
    ]) {
      expect(findItem(items, testSubj)?.disabled).toBe(true);
      expect(findItem(items, testSubj)?.toolTipContent).toBeTruthy();
    }
    expect(findItem(items, 'updateApiKeyActionPolicy-policy-1')?.disabled).toBeFalsy();
    expect(findItem(items, 'deleteActionPolicy-policy-1')?.disabled).toBeFalsy();
  });

  it('calls closeMenu before running the item action', () => {
    const calls: string[] = [];
    const { result } = renderMenuHook({
      onClone: () => calls.push('clone'),
      closeMenu: () => calls.push('close'),
    });

    findItem(getItems(result), 'cloneActionPolicy-policy-1')?.onClick?.();

    expect(calls).toEqual(['close', 'clone']);
  });

  it('runs item actions without a closeMenu', () => {
    const { result, props } = renderMenuHook();

    findItem(getItems(result), 'deleteActionPolicy-policy-1')?.onClick?.();

    expect(props.onDelete).toHaveBeenCalledWith(props.policy);
  });

  it('returns the snooze modal after Snooze is clicked, and applying it calls onSnooze', async () => {
    const onSnooze = jest.fn();
    const { result } = renderMenuHook({ onSnooze, onCancelSnooze: jest.fn() });
    expect(result.current.modal).toBeNull();

    act(() => {
      findItem(getItems(result), 'snoozeActionPolicy-policy-1')?.onClick?.();
    });
    expect(result.current.modal).not.toBeNull();

    render(<I18nProvider>{result.current.modal}</I18nProvider>);
    act(() => {
      screen.getByTestId('actionPolicySnoozeModalApply').click();
    });

    expect(onSnooze).toHaveBeenCalledTimes(1);
    expect(onSnooze.mock.calls[0][0]).toBe('policy-1');
    expect(result.current.modal).toBeNull();
  });

  it('switches Unsnooze back to Snooze when the snooze expires', () => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00.000Z') });
    try {
      const { result } = renderMenuHook({
        policy: createPolicy({ snoozed_until: '2026-01-01T00:01:00.000Z' }),
        onSnooze: jest.fn(),
        onCancelSnooze: jest.fn(),
      });
      expect(findItem(getItems(result), 'unsnoozeActionPolicy-policy-1')).toBeDefined();

      act(() => {
        jest.advanceTimersByTime(60_000);
      });

      expect(findItem(getItems(result), 'unsnoozeActionPolicy-policy-1')).toBeUndefined();
      expect(findItem(getItems(result), 'snoozeActionPolicy-policy-1')).toBeDefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('keeps the same panels across renders when its inputs do not change', () => {
    const { result, rerender } = renderMenuHook();
    const first = result.current.panels;

    rerender();

    expect(result.current.panels).toBe(first);
  });
});
