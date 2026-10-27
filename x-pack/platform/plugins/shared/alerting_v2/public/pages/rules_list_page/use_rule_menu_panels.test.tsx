/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MouseEvent } from 'react';
import { renderHook } from '@testing-library/react';
import type { FlyoutFooterMenuItem, FlyoutFooterMenuPanel } from '@kbn/flyout-template';
import type { RuleApiResponse } from '../../services/rules_api';
import type { UseRuleMenuPanelsParams } from './use_rule_menu_panels';
import { useRuleMenuPanels } from './use_rule_menu_panels';

const rule: RuleApiResponse = {
  id: 'rule-1',
  kind: 'alert',
  enabled: true,
  version: 1,
  metadata: { name: 'My Rule' },
  artifacts: [],
  time_field: '@timestamp',
  schedule: { every: '5m' },
  query: { base: 'FROM logs-* | LIMIT 1' },
  created_by: { profile_uid: 'elastic' },
  created_at: '2026-03-01T12:00:00.000Z',
  updated_by: { profile_uid: 'elastic' },
  updated_at: '2026-03-01T12:00:00.000Z',
};

type ActionItem = FlyoutFooterMenuItem & {
  'data-test-subj'?: string;
  onClick?: (event?: MouseEvent) => void;
  href?: string;
  disabled?: boolean;
  toolTipContent?: unknown;
};

const renderPanels = (params: Partial<UseRuleMenuPanelsParams> = {}) => {
  const props: UseRuleMenuPanelsParams = {
    rule,
    canWrite: true,
    onEdit: jest.fn(),
    onClone: jest.fn(),
    onDelete: jest.fn(),
    ...params,
  };
  const hook = renderHook(() => useRuleMenuPanels(props));
  return { ...hook, props };
};

const getItems = (panels: FlyoutFooterMenuPanel[]) => panels[0].items as ActionItem[];

const testSubjectsOf = (panels: FlyoutFooterMenuPanel[]) =>
  getItems(panels).map((item) => ('isSeparator' in item ? '|' : item['data-test-subj']));

const findItem = (panels: FlyoutFooterMenuPanel[], testSubj: string) =>
  getItems(panels).find((item) => item['data-test-subj'] === testSubj);

const ALL_HANDLERS = {
  onRun: jest.fn(),
  onToggleEnabled: jest.fn(),
  onUpdateApiKey: jest.fn(),
  onViewChangeHistory: jest.fn(),
  detailsLink: { href: '/rules/rule-1', onClick: jest.fn() },
};

describe('useRuleMenuPanels', () => {
  it('groups every action with separators and rule-scoped test subjects', () => {
    const { result } = renderPanels(ALL_HANDLERS);

    expect(testSubjectsOf(result.current)).toEqual([
      'viewRuleDetails-rule-1',
      'runRule-rule-1',
      'editRule-rule-1',
      'cloneRule-rule-1',
      '|',
      'viewChangeHistoryRule-rule-1',
      'toggleEnabledRule-rule-1',
      'updateRuleApiKey-rule-1',
      '|',
      'deleteRule-rule-1',
    ]);
  });

  it('keeps only read actions when canWrite is false', () => {
    const { result } = renderPanels({ ...ALL_HANDLERS, canWrite: false });

    expect(testSubjectsOf(result.current)).toEqual([
      'viewRuleDetails-rule-1',
      '|',
      'viewChangeHistoryRule-rule-1',
    ]);
  });

  it('returns no panels when no action is available', () => {
    const { result } = renderPanels({ canWrite: false });

    expect(result.current).toEqual([]);
  });

  it('disables run and update API key with a tooltip when the rule is disabled', () => {
    const { result } = renderPanels({ ...ALL_HANDLERS, rule: { ...rule, enabled: false } });

    for (const testSubj of ['runRule-rule-1', 'updateRuleApiKey-rule-1']) {
      expect(findItem(result.current, testSubj)?.disabled).toBe(true);
      expect(findItem(result.current, testSubj)?.toolTipContent).toBeTruthy();
    }
    expect(findItem(result.current, 'toggleEnabledRule-rule-1')?.disabled).toBeFalsy();
  });

  it('links view details to detailsLink and closes the menu before following it', () => {
    const calls: string[] = [];
    const event = {} as MouseEvent;
    const onNavigate = jest.fn(() => calls.push('navigate'));
    const { result } = renderPanels({
      detailsLink: { href: '/rules/rule-1', onClick: onNavigate },
      closeMenu: () => calls.push('close'),
    });
    const viewDetails = findItem(result.current, 'viewRuleDetails-rule-1');

    expect(viewDetails?.href).toBe('/rules/rule-1');
    viewDetails?.onClick?.(event);

    expect(calls).toEqual(['close', 'navigate']);
    expect(onNavigate).toHaveBeenCalledWith(event);
  });

  it('calls closeMenu before running the item action', () => {
    const calls: string[] = [];
    const { result } = renderPanels({
      onDelete: () => calls.push('delete'),
      closeMenu: () => calls.push('close'),
    });

    findItem(result.current, 'deleteRule-rule-1')?.onClick?.();

    expect(calls).toEqual(['close', 'delete']);
  });

  it('runs item actions without a closeMenu', () => {
    const { result, props } = renderPanels();

    findItem(result.current, 'editRule-rule-1')?.onClick?.();

    expect(props.onEdit).toHaveBeenCalledWith(rule);
  });

  it('keeps the same panels across renders when its inputs do not change', () => {
    const { result, rerender } = renderPanels(ALL_HANDLERS);
    const first = result.current;

    rerender();

    expect(result.current).toBe(first);
  });
});
