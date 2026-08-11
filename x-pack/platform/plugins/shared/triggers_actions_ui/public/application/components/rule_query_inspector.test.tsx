/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleQueryInspector } from './rule_query_inspector';
import { useKibana } from '../../common/lib/kibana';
import * as inspectQueryApi from '../lib/rule_api/inspect_query';

jest.mock('../../common/lib/kibana');
jest.mock('../lib/rule_api/inspect_query');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const loadRuleQueryInspectorMock = inspectQueryApi.loadRuleQueryInspector as jest.Mock;

const mockResponse = {
  queries: [
    {
      index: 'metrics-*',
      request: { body: { query: { bool: { filter: [] } } } },
      response: { hits: { total: { value: 0 } } },
      label: 'Criterion 1: avg(system.cpu)',
    },
    {
      index: 'metrics-*',
      request: { body: { query: { bool: { filter: [{ range: {} }] } } } },
      response: { hits: { total: { value: 5 } } },
      label: 'Criterion 2: max(system.memory)',
    },
  ],
};

const mockInspectorOpen = jest.fn();
const mockToastsAddError = jest.fn();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

describe('RuleQueryInspector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibanaMock as unknown as jest.Mock).mockReturnValue({
      services: {
        http: {},
        inspector: { open: mockInspectorOpen },
        notifications: { toasts: { addError: mockToastsAddError } },
      },
    });
  });

  it('renders the Inspect button for supported rule types', () => {
    render(
      <Wrapper>
        <RuleQueryInspector ruleId="rule-123" ruleTypeId="observability.rules.custom_threshold" />
      </Wrapper>
    );

    expect(screen.getByTestId('ruleQueryInspectorButton')).toBeInTheDocument();
    expect(screen.getByText('Inspect')).toBeInTheDocument();
  });

  it('renders nothing for unsupported rule types', () => {
    const { container } = render(
      <Wrapper>
        <RuleQueryInspector ruleId="rule-123" ruleTypeId="some.unsupported.rule" />
      </Wrapper>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when inspector plugin is not available', () => {
    (useKibanaMock as unknown as jest.Mock).mockReturnValue({
      services: {
        http: {},
        notifications: { toasts: { addError: mockToastsAddError } },
      },
    });

    const { container } = render(
      <Wrapper>
        <RuleQueryInspector ruleId="rule-123" ruleTypeId="observability.rules.custom_threshold" />
      </Wrapper>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('fetches the API and opens the inspector on click', async () => {
    loadRuleQueryInspectorMock.mockResolvedValue(mockResponse);

    render(
      <Wrapper>
        <RuleQueryInspector ruleId="rule-123" ruleTypeId="observability.rules.custom_threshold" />
      </Wrapper>
    );

    await userEvent.click(screen.getByTestId('ruleQueryInspectorButton'));

    await waitFor(() => {
      expect(loadRuleQueryInspectorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-123',
          mode: 'execute',
        })
      );
    });

    expect(mockInspectorOpen).toHaveBeenCalledWith(
      expect.objectContaining({ requests: expect.any(Object) }),
      expect.objectContaining({ title: 'Inspect' })
    );
  });

  it('passes alert_id to the API call when alertId prop is provided', async () => {
    loadRuleQueryInspectorMock.mockResolvedValue({ queries: [mockResponse.queries[0]] });

    render(
      <Wrapper>
        <RuleQueryInspector
          ruleId="rule-123"
          ruleTypeId="observability.rules.custom_threshold"
          alertId="alert-456"
        />
      </Wrapper>
    );

    await userEvent.click(screen.getByTestId('ruleQueryInspectorButton'));

    await waitFor(() => {
      expect(loadRuleQueryInspectorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'rule-123',
          mode: 'execute',
          alertId: 'alert-456',
        })
      );
    });
  });

  it('shows a toast error on API failure', async () => {
    loadRuleQueryInspectorMock.mockRejectedValue(new Error('Network error'));

    render(
      <Wrapper>
        <RuleQueryInspector ruleId="rule-123" ruleTypeId="observability.rules.custom_threshold" />
      </Wrapper>
    );

    await userEvent.click(screen.getByTestId('ruleQueryInspectorButton'));

    await waitFor(() => {
      expect(mockToastsAddError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ title: 'Unable to load query' })
      );
    });

    expect(mockInspectorOpen).not.toHaveBeenCalled();
  });
});
