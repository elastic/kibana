/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleQueryInspector, RuleQueryInspectorFlyout } from './rule_query_inspector';
import { useKibana } from '../../common/lib/kibana';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
  },
});

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

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  </IntlProvider>
);

describe('RuleQueryInspector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
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

  it('opens the flyout when the button is clicked', async () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <Wrapper>
        <RuleQueryInspector ruleId="rule-123" ruleTypeId="observability.rules.custom_threshold" />
      </Wrapper>
    );

    await userEvent.click(screen.getByTestId('ruleQueryInspectorButton'));

    expect(screen.getByTestId('ruleQueryInspectorFlyout')).toBeInTheDocument();
  });
});

describe('RuleQueryInspectorFlyout', () => {
  const onClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('shows loading spinner while fetching', () => {
    useKibanaMock().services.http.get = jest.fn().mockImplementation(() => new Promise(() => {}));

    render(
      <Wrapper>
        <RuleQueryInspectorFlyout ruleId="rule-123" onClose={onClose} />
      </Wrapper>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('displays the request JSON in the Request tab', async () => {
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue({
      queries: [mockResponse.queries[0]],
    });

    render(
      <Wrapper>
        <RuleQueryInspectorFlyout ruleId="rule-123" onClose={onClose} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/"filter"/)).toBeInTheDocument();
    });
  });

  it('shows error callout on fetch failure', async () => {
    useKibanaMock().services.http.get = jest.fn().mockRejectedValue(new Error('Network error'));

    render(
      <Wrapper>
        <RuleQueryInspectorFlyout ruleId="rule-123" onClose={onClose} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to load query')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('renders criterion selector when multiple queries are returned', async () => {
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue(mockResponse);

    render(
      <Wrapper>
        <RuleQueryInspectorFlyout ruleId="rule-123" onClose={onClose} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('ruleQueryInspectorCriterionSelect')).toBeInTheDocument();
    });
  });

  it('does not render criterion selector for a single query', async () => {
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue({
      queries: [mockResponse.queries[0]],
    });

    render(
      <Wrapper>
        <RuleQueryInspectorFlyout ruleId="rule-123" onClose={onClose} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/"filter"/)).toBeInTheDocument();
    });

    expect(screen.queryByTestId('ruleQueryInspectorCriterionSelect')).not.toBeInTheDocument();
  });

  it('passes evaluationTimeRange to the API call', async () => {
    const mockGet = jest.fn().mockResolvedValue({ queries: [mockResponse.queries[0]] });
    useKibanaMock().services.http.get = mockGet;

    render(
      <Wrapper>
        <RuleQueryInspectorFlyout
          ruleId="rule-123"
          onClose={onClose}
          evaluationTimeRange={{ gte: '2026-01-01T00:00:00Z', lte: '2026-01-01T00:05:00Z' }}
        />
      </Wrapper>
    );

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/query_inspector'),
        expect.objectContaining({
          query: expect.objectContaining({
            start: '2026-01-01T00:00:00Z',
            end: '2026-01-01T00:05:00Z',
          }),
        })
      );
    });
  });

  it('triggers execute mode when Response tab is clicked', async () => {
    const mockGet = jest.fn().mockResolvedValue({ queries: [mockResponse.queries[0]] });
    useKibanaMock().services.http.get = mockGet;

    render(
      <Wrapper>
        <RuleQueryInspectorFlyout ruleId="rule-123" onClose={onClose} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText(/"filter"/)).toBeInTheDocument();
    });

    await userEvent.click(screen.getByText('Response'));

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith(
        expect.stringContaining('/query_inspector'),
        expect.objectContaining({
          query: expect.objectContaining({ mode: 'execute' }),
        })
      );
    });
  });
});
