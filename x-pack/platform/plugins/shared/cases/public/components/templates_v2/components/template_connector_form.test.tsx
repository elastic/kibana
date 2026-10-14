/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { TemplateConnectorForm } from './template_connector_form';

const mockUseFormData = jest.fn();

jest.mock('@kbn/es-ui-shared-plugin/static/forms/hook_form_lib', () => ({
  Form: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useForm: () => ({ form: {} }),
  useFormData: () => mockUseFormData(),
}));

jest.mock('../../case_form_fields/connector', () => ({
  Connector: () => <div data-test-subj="mock-connector" />,
}));

jest.mock('../../../containers/configure/use_get_supported_action_connectors', () => ({
  useGetSupportedActionConnectors: () => ({
    data: [{ id: 'my-connector', name: 'My Connector', actionTypeId: '.jira' }],
    isLoading: false,
  }),
}));

describe('TemplateConnectorForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lifts the selected connector including its dynamic fields', async () => {
    mockUseFormData.mockReturnValue([
      {
        connectorId: 'my-connector',
        fields: { issueType: '10001', priority: 'High', parent: null },
      },
    ]);
    const onChange = jest.fn();

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
    const onChange = jest.fn();

    render(<TemplateConnectorForm onChange={onChange} />);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ type: '.none', id: 'none', fields: null });
    });
  });
});
