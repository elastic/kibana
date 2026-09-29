/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useRuleChangeHistoryModal } from './use_rule_change_history_modal';

const mockOpenModal = vi.fn();

vi.mock('@kbn/change-history-ui', () => {
  const mocked = {
    useChangeHistoryModal: () => ({ openModal: mockOpenModal, closeModal: vi.fn(), isOpen: false }),
  };
  return { ...mocked, default: mocked };
});

const mockProviderRenders: Array<{ ruleId: string; ruleName: string; analytics: unknown }> = [];

vi.mock('./rule_change_history_provider', () => {
  const mocked = {
    RuleChangeHistoryProvider: (props: {
      ruleId: string;
      ruleName: string;
      analytics: unknown;
      children: React.ReactNode;
    }) => {
      mockProviderRenders.push({
        ruleId: props.ruleId,
        ruleName: props.ruleName,
        analytics: props.analytics,
      });
      return <div data-test-subj="provider">{props.children}</div>;
    },
  };
  return { ...mocked, default: mocked };
});

const mockAnalyticsStub = { reportEvent: vi.fn() };

vi.mock('@kbn/core-di-browser', () => {
  const mocked = {
    CoreStart: (key: string) => `CoreStart:${key}`,
    useService: (token: unknown) => (token === 'CoreStart:analytics' ? mockAnalyticsStub : {}),
  };
  return { ...mocked, default: mocked };
});

const Harness = () => {
  const { openChangeHistory, changeHistoryModal } = useRuleChangeHistoryModal();

  return (
    <>
      <button data-test-subj="openA" onClick={() => openChangeHistory({ id: 'a', name: 'Rule A' })}>
        a
      </button>
      <button data-test-subj="openB" onClick={() => openChangeHistory({ id: 'b', name: 'Rule B' })}>
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
});
