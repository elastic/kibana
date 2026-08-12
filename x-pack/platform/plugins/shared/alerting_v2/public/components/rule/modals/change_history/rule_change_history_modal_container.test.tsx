/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

const mockOpenModal = jest.fn();

jest.mock('@kbn/change-history-ui', () => ({
  useChangeHistoryModal: () => ({ openModal: mockOpenModal, closeModal: jest.fn(), isOpen: false }),
}));

const mockProviderRenders: Array<{ ruleId: string; ruleName: string; analytics: unknown }> = [];

jest.mock('./rule_change_history_provider', () => ({
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
}));

const mockAnalyticsStub = { reportEvent: jest.fn() };

jest.mock('@kbn/core-di-browser', () => ({
  CoreStart: (key: string) => `CoreStart:${key}`,
  useService: (token: unknown) => (token === 'CoreStart:analytics' ? mockAnalyticsStub : {}),
}));

import { RuleChangeHistoryModalContainer } from './rule_change_history_modal_container';

const renderContainer = () =>
  render(
    <RuleChangeHistoryModalContainer>
      {(open) => (
        <>
          <button data-test-subj="openA" onClick={() => open({ id: 'a', name: 'Rule A' })}>
            a
          </button>
          <button data-test-subj="openB" onClick={() => open({ id: 'b', name: 'Rule B' })}>
            b
          </button>
        </>
      )}
    </RuleChangeHistoryModalContainer>
  );

const lastProviderRender = () => mockProviderRenders[mockProviderRenders.length - 1];

describe('RuleChangeHistoryModalContainer', () => {
  beforeEach(() => {
    mockOpenModal.mockClear();
    mockProviderRenders.length = 0;
  });

  it('does not mount the provider or open the modal until a rule is requested', () => {
    renderContainer();

    expect(mockProviderRenders).toHaveLength(0);
    expect(mockOpenModal).not.toHaveBeenCalled();
  });

  it('forwards analytics from DI to the provider', () => {
    renderContainer();

    fireEvent.click(screen.getByTestId('openA'));

    expect(lastProviderRender().analytics).toBe(mockAnalyticsStub);
  });

  it('selects the rule and opens the modal when a target is requested', () => {
    renderContainer();

    fireEvent.click(screen.getByTestId('openA'));

    expect(lastProviderRender().ruleId).toBe('a');
    expect(lastProviderRender().ruleName).toBe('Rule A');
    expect(mockOpenModal).toHaveBeenCalledTimes(1);
  });

  it('switches the target and re-opens when a different rule is requested', () => {
    renderContainer();

    fireEvent.click(screen.getByTestId('openA'));
    fireEvent.click(screen.getByTestId('openB'));

    expect(lastProviderRender().ruleId).toBe('b');
    expect(lastProviderRender().ruleName).toBe('Rule B');
    expect(mockOpenModal).toHaveBeenCalledTimes(2);
  });

  it('re-opens the modal for the same rule (remount key advances even when the rule is unchanged)', () => {
    renderContainer();

    fireEvent.click(screen.getByTestId('openA'));
    fireEvent.click(screen.getByTestId('openA'));

    expect(lastProviderRender().ruleId).toBe('a');
    expect(mockOpenModal).toHaveBeenCalledTimes(2);
  });
});
