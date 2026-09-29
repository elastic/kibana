/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TemplateConnectorForm } from './template_connector_form';

const mockUseFormData = vi.fn();

vi.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => {
  const mocked = {
    Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useForm: () => ({ form: {} }),
    useFormData: () => mockUseFormData(),
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../case_form_fields/connector', () => {
  const mocked = {
    Connector: () => <div data-test-subj="mock-connector" />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('../../../containers/configure/use_get_supported_action_connectors', () => {
  const mocked = {
    useGetSupportedActionConnectors: () => ({
      data: [{ id: 'my-connector', name: 'My Connector', actionTypeId: '.jira' }],
      isLoading: false,
    }),
  };
  return { ...mocked, default: mocked };
});

describe('TemplateConnectorForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lifts the selected connector including its dynamic fields', async () => {
    mockUseFormData.mockReturnValue([
      {
        connectorId: 'my-connector',
        fields: { issueType: '10001', priority: 'High', parent: null },
      },
    ]);
    const onChange = vi.fn();

    render(<TemplateConnectorForm onChange={onChange} />);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        type: '.jira',
        id: 'my-connector',
        fields: { issueType: '10001', priority: 'High', parent: null },
      });
    });
  });

  it('lifts a .none connector with null fields when the id is not a real connector', async () => {
    mockUseFormData.mockReturnValue([{ connectorId: 'none', fields: {} }]);
    const onChange = vi.fn();

    render(<TemplateConnectorForm onChange={onChange} />);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ type: '.none', id: 'none', fields: null });
    });
  });
});
