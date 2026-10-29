/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import type { ChangeHistoryAdapter } from '@kbn/change-history-ui';
import { ruleKeys } from '../../../../hooks/query_key_factory';
import { useRuleChangeHistoryModal } from './use_rule_change_history_modal';

const mockOpenModal = jest.fn();

jest.mock('@kbn/change-history-ui', () => ({
  useChangeHistoryModal: () => ({ openModal: mockOpenModal, closeModal: jest.fn(), isOpen: false }),
}));

const mockProviderRenders: Array<{
  ruleId: string;
  ruleName: string;
  analytics: unknown;
  canRestore?: boolean;
  adapter: ChangeHistoryAdapter;
}> = [];

jest.mock('./rule_change_history_provider', () => ({
  RuleChangeHistoryProvider: (props: {
    ruleId: string;
    ruleName: string;
    analytics: unknown;
    canRestore?: boolean;
    adapter: ChangeHistoryAdapter;
    children: React.ReactNode;
  }) => {
    mockProviderRenders.push({
      ruleId: props.ruleId,
      ruleName: props.ruleName,
      analytics: props.analytics,
      canRestore: props.canRestore,
      adapter: props.adapter,
    });
    return <div data-test-subj="provider">{props.children}</div>;
  },
}));

const mockAnalyticsStub = { reportEvent: jest.fn() };
const mockNotificationsStub = { toasts: { addSuccess: jest.fn() } };
const mockApiStub = { restoreRuleChange: jest.fn() };

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => `CoreStart:${key}`,
  useService: (token: unknown) => {
    if (token === 'CoreStart:analytics') return mockAnalyticsStub;
    if (token === 'CoreStart:notifications') return mockNotificationsStub;
    return mockApiStub;
  },
}));

const mockInvalidateQueries = jest.fn();

jest.mock('@kbn/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

const mockInvalidateRulesContentList = jest.fn();

jest.mock('../../../../hooks/invalidate_rules_content_list', () => ({
  invalidateRulesContentList: () => mockInvalidateRulesContentList(),
}));

const Harness = ({ canRestore }: { canRestore?: boolean }) => {
  const { openChangeHistory, changeHistoryModal } = useRuleChangeHistoryModal({ canRestore });

  return (
    <>
      <button
        data-test-subj="openA"
        onClick={() => openChangeHistory({ id: 'a', name: 'Rule A', version: 3 })}
      >
        a
      </button>
      <button
        data-test-subj="openB"
        onClick={() => openChangeHistory({ id: 'b', name: 'Rule B', version: 7 })}
      >
        b
      </button>
      {changeHistoryModal}
    </>
  );
};

const lastProviderRender = () => mockProviderRenders[mockProviderRenders.length - 1];

describe('useRuleChangeHistoryModal', () => {
  beforeEach(() => {
    mockOpenModal.mockClear();
    mockInvalidateQueries.mockClear();
    mockInvalidateRulesContentList.mockClear();
    mockApiStub.restoreRuleChange.mockReset();
    mockNotificationsStub.toasts.addSuccess.mockClear();
    mockProviderRenders.length = 0;
  });

  it('renders no modal and does not open until a rule is requested', () => {
    render(<Harness />);

    expect(screen.queryByTestId('provider')).toBeNull();
    expect(mockProviderRenders).toHaveLength(0);
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it('forwards analytics from DI to the provider', () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId('openA'));

    expect(lastProviderRender().analytics).toBe(mockAnalyticsStub);
  });

  it('mounts the modal for the selected rule and opens it', () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId('openA'));

    expect(lastProviderRender().ruleId).toBe('a');
    expect(lastProviderRender().ruleName).toBe('Rule A');
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });

  it('switches the target and re-opens when a different rule is requested', () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId('openA'));
    fireEvent.click(screen.getByTestId('openB'));

    expect(lastProviderRender().ruleId).toBe('b');
    expect(lastProviderRender().ruleName).toBe('Rule B');
    expect(mockOpenModal).toHaveBeenCalledTimes(2);
  });

  it('re-opens the modal for the same rule (remount key advances even when the rule is unchanged)', () => {
    render(<Harness />);

    fireEvent.click(screen.getByTestId('openA'));
    fireEvent.click(screen.getByTestId('openA'));

    expect(lastProviderRender().ruleId).toBe('a');
    expect(mockOpenModal).toHaveBeenCalledTimes(2);
  });

  it('disables restore by default and forwards canRestore to the provider', () => {
    const { rerender } = render(<Harness />);

    fireEvent.click(screen.getByTestId('openA'));
    expect(lastProviderRender().canRestore).toBe(false);

    rerender(<Harness canRestore />);
    expect(lastProviderRender().canRestore).toBe(true);
  });

  it('refetches the rule list, tags and the restored rule after a restore', async () => {
    mockApiStub.restoreRuleChange.mockResolvedValueOnce({
      id: 'a',
      version: 4,
      metadata: { name: 'Rule A' },
    });
    render(<Harness canRestore />);

    fireEvent.click(screen.getByTestId('openA'));
    await act(() =>
      lastProviderRender().adapter.restoreChange?.({ objectId: 'a', changeId: 'evt-1' })
    );

    expect(mockInvalidateRulesContentList).toHaveBeenCalledTimes(1);
    expect(mockInvalidateQueries).toHaveBeenCalledWith(ruleKeys.lists());
    expect(mockInvalidateQueries).toHaveBeenCalledWith(ruleKeys.allTags());
    expect(mockInvalidateQueries).toHaveBeenCalledWith(ruleKeys.detail('a'));
    expect(mockNotificationsStub.toasts.addSuccess).toHaveBeenCalledWith(
      'Rule "Rule A" restored as version 4'
    );
  });

  it('guards restores with the opened rule version and then the version each restore produced', async () => {
    mockApiStub.restoreRuleChange
      .mockResolvedValueOnce({ id: 'a', version: 4, metadata: { name: 'Rule A' } })
      .mockResolvedValueOnce({ id: 'a', version: 5, metadata: { name: 'Rule A' } });
    render(<Harness canRestore />);

    fireEvent.click(screen.getByTestId('openA'));
    await act(() =>
      lastProviderRender().adapter.restoreChange?.({ objectId: 'a', changeId: 'evt-1' })
    );
    await act(() =>
      lastProviderRender().adapter.restoreChange?.({ objectId: 'a', changeId: 'evt-2' })
    );

    expect(mockApiStub.restoreRuleChange).toHaveBeenNthCalledWith(1, {
      eventId: 'evt-1',
      currentVersion: 3,
      signal: undefined,
    });
    expect(mockApiStub.restoreRuleChange).toHaveBeenNthCalledWith(2, {
      eventId: 'evt-2',
      currentVersion: 4,
      signal: undefined,
    });
  });

  it('retitles the open modal with the restored rule name', async () => {
    mockApiStub.restoreRuleChange.mockResolvedValueOnce({
      id: 'a',
      version: 4,
      metadata: { name: 'Rule A before rename' },
    });
    render(<Harness canRestore />);

    fireEvent.click(screen.getByTestId('openA'));
    await act(() =>
      lastProviderRender().adapter.restoreChange?.({ objectId: 'a', changeId: 'evt-1' })
    );

    expect(lastProviderRender().ruleName).toBe('Rule A before rename');
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });
});
