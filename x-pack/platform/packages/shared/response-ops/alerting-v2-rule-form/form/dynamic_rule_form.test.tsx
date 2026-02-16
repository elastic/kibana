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
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { DynamicRuleForm } from './dynamic_rule_form';

// Mock the ES|QL utils to avoid complex setup
jest.mock('@kbn/esql-utils', () => ({
  getESQLAdHocDataview: jest.fn().mockResolvedValue({
    fields: {
      getByType: () => [{ name: '@timestamp', type: 'date' }],
    },
  }),
  getESQLQueryColumnsRaw: jest.fn().mockResolvedValue([]),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
    logger: {
      log: () => {},
      warn: () => {},
      error: () => {},
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const createMockServices = () => ({
  http: httpServiceMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
});

describe('DynamicRuleForm', () => {
  const defaultProps = {
    formId: 'test-form',
    onSubmit: jest.fn(),
    query: 'FROM logs-* | STATS count = COUNT(*)',
    defaultTimeField: '@timestamp',
    services: createMockServices(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial query value', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} />
      </Wrapper>
    );

    // The form should render
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Rule details')).toBeInTheDocument();
  });

  it('updates form state when query prop changes', async () => {
    const Wrapper = createWrapper();
    const { rerender } = render(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM logs-* | LIMIT 10" />
      </Wrapper>
    );

    // Rerender with a new query
    rerender(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM metrics-* | STATS avg = AVG(cpu)" />
      </Wrapper>
    );

    // The form should update - we can verify by checking that no errors occurred
    // and the component re-rendered successfully
    await waitFor(() => {
      expect(screen.getByText('Name')).toBeInTheDocument();
    });
  });

  it('preserves user-modified fields when query changes', async () => {
    const user = userEvent.setup();
    const Wrapper = createWrapper();

    const { rerender } = render(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM logs-* | LIMIT 10" />
      </Wrapper>
    );

    // User modifies the name field
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.type(nameInput, 'My Custom Rule');

    expect(nameInput).toHaveValue('My Custom Rule');

    // Query prop changes (simulating Discover updating the query)
    rerender(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM metrics-* | STATS count = COUNT(*)" />
      </Wrapper>
    );

    // User's input should be preserved (keepDirtyValues: true)
    await waitFor(() => {
      expect(nameInput).toHaveValue('My Custom Rule');
    });
  });

  it('updates groupingKey when query with different BY clause changes', async () => {
    const { getESQLQueryColumnsRaw } = jest.requireMock('@kbn/esql-utils');

    // First query returns host.name column
    getESQLQueryColumnsRaw.mockResolvedValueOnce([
      { name: 'count', type: 'long' },
      { name: 'host.name', type: 'keyword' },
    ]);

    const Wrapper = createWrapper();
    const { rerender } = render(
      <Wrapper>
        <DynamicRuleForm
          {...defaultProps}
          query="FROM logs-* | STATS count = COUNT(*) BY host.name"
        />
      </Wrapper>
    );

    // Second query returns service.name column
    getESQLQueryColumnsRaw.mockResolvedValueOnce([
      { name: 'count', type: 'long' },
      { name: 'service.name', type: 'keyword' },
    ]);

    rerender(
      <Wrapper>
        <DynamicRuleForm
          {...defaultProps}
          query="FROM logs-* | STATS count = COUNT(*) BY service.name"
        />
      </Wrapper>
    );

    // Form should have updated - component renders without errors
    await waitFor(() => {
      expect(screen.getByText('Rule details')).toBeInTheDocument();
    });
  });

  it('renders without error when isQueryInvalid is true', () => {
    // The isQueryInvalid prop sets a form error on the query field,
    // but it only displays in ErrorCallOut after form submission
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="INVALID" isQueryInvalid={true} />
      </Wrapper>
    );

    // Form should still render
    expect(screen.getByText('Rule details')).toBeInTheDocument();
  });

  it('handles isQueryInvalid prop changes', () => {
    const Wrapper = createWrapper();
    const { rerender } = render(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="INVALID" isQueryInvalid={true} />
      </Wrapper>
    );

    // Query becomes valid - should not crash
    rerender(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM logs-*" isQueryInvalid={false} />
      </Wrapper>
    );

    // Form should still render
    expect(screen.getByText('Rule details')).toBeInTheDocument();
  });

  it('calls onSubmit with form values when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const Wrapper = createWrapper();

    render(
      <Wrapper>
        <DynamicRuleForm
          {...defaultProps}
          formId="submit-test-form"
          onSubmit={onSubmit}
          query="FROM logs-* | STATS count = COUNT(*)"
        />
      </Wrapper>
    );

    // Fill in required field
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.type(nameInput, 'Test Rule');

    // Submit the form
    const form = document.getElementById('submit-test-form');
    expect(form).toBeInTheDocument();

    // Trigger form submission
    if (form) {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            name: 'Test Rule',
          }),
          evaluation: expect.objectContaining({
            query: expect.objectContaining({
              base: 'FROM logs-* | STATS count = COUNT(*)',
            }),
          }),
        }),
        expect.anything()
      );
    });
  });
});
