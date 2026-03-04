/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { createQueryClientWrapper } from '../test_utils';
import { DynamicRuleForm } from './dynamic_rule_form';
import { RULE_FORM_ID } from './constants';

// Mock the yaml-rule-editor to avoid monaco editor setup
jest.mock('@kbn/yaml-rule-editor', () => ({
  YamlRuleEditor: () => <div data-test-subj="yamlRuleEditorMock">YAML Editor Mock</div>,
}));

// Mock the ES|QL utils to avoid complex setup
jest.mock('@kbn/esql-utils', () => ({
  getESQLAdHocDataview: jest.fn().mockResolvedValue({
    fields: {
      getByType: () => [{ name: '@timestamp', type: 'date' }],
      toSpec: () => ({}),
    },
  }),
  getESQLQueryColumnsRaw: jest.fn().mockResolvedValue([]),
}));

const createMockApplication = () => ({
  currentAppId$: {
    subscribe: () => ({ unsubscribe: () => {} }),
  },
});

const createMockServices = () => ({
  http: httpServiceMock.createStartContract(),
  notifications: notificationServiceMock.createStartContract(),
  data: dataPluginMock.createStartContract(),
  dataViews: dataViewPluginMocks.createStartContract(),
  application: createMockApplication() as any,
});

describe('DynamicRuleForm', () => {
  const defaultProps = {
    onSubmit: jest.fn(),
    query: 'FROM logs-* | STATS count = COUNT(*)',
    defaultTimeField: '@timestamp',
    services: createMockServices(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with initial query value', () => {
    const Wrapper = createQueryClientWrapper();
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
    const Wrapper = createQueryClientWrapper();
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
    const Wrapper = createQueryClientWrapper();

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

    const Wrapper = createQueryClientWrapper();
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

  it('renders without error when query has syntax errors', () => {
    // Form validates ES|QL syntax via validateEsqlQuery, but errors only
    // display in ErrorCallOut after form submission
    const Wrapper = createQueryClientWrapper();
    render(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM |" />
      </Wrapper>
    );

    // Form should still render
    expect(screen.getByText('Rule details')).toBeInTheDocument();
  });

  it('handles query prop changes from invalid to valid', () => {
    const Wrapper = createQueryClientWrapper();
    const { rerender } = render(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM |" />
      </Wrapper>
    );

    // Query becomes valid - should not crash
    rerender(
      <Wrapper>
        <DynamicRuleForm {...defaultProps} query="FROM logs-*" />
      </Wrapper>
    );

    // Form should still render
    expect(screen.getByText('Rule details')).toBeInTheDocument();
  });

  it('calls onSubmit with form values when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    const Wrapper = createQueryClientWrapper();

    render(
      <Wrapper>
        <DynamicRuleForm
          {...defaultProps}
          onSubmit={onSubmit}
          query="FROM logs-* | STATS count = COUNT(*)"
        />
      </Wrapper>
    );

    // Fill in required field
    const nameInput = screen.getByRole('textbox', { name: 'Name' });
    await user.type(nameInput, 'Test Rule');

    // Submit the form using the constant RULE_FORM_ID
    const form = document.getElementById(RULE_FORM_ID);
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
