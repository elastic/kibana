/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiProvider } from '@elastic/eui';
import { ToolType } from '@kbn/agent-builder-common';
import { ToolCreateFlyout } from './tool_create_flyout';

jest.mock('../../../hooks/tools/use_create_tools');
jest.mock('../../../hooks/tools/use_tool_form');
jest.mock('../../tools/form/registry/tools_form_registry');

jest.mock('../../tools/form/tool_form', () => {
  const actual = jest.requireActual('../../tools/form/tool_form');
  return {
    ...actual,
    ToolForm: () => <div data-test-subj="toolForm" />,
  };
});

const { useCreateTool } = jest.requireMock('../../../hooks/tools/use_create_tools');
const { useToolForm } = jest.requireMock('../../../hooks/tools/use_tool_form');
const { getCreatePayloadFromData } = jest.requireMock(
  '../../tools/form/registry/tools_form_registry'
);

const mockFormData = {
  type: ToolType.esql,
  toolId: 'sales.recent_orders',
  description: 'Returns recent sales orders',
  labels: [],
  esql: '',
  params: [],
};

const renderComponent = (props: Partial<React.ComponentProps<typeof ToolCreateFlyout>> = {}) =>
  render(
    <EuiProvider>
      <IntlProvider locale="en">
        <ToolCreateFlyout onClose={jest.fn()} {...props} />
      </IntlProvider>
    </EuiProvider>
  );

describe('ToolCreateFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    useToolForm.mockReturnValue({
      handleSubmit: (fn: (data: unknown) => void) => () => fn(mockFormData),
      formState: { errors: {} },
    });

    useCreateTool.mockReturnValue({
      isSubmitting: false,
      createTool: jest.fn(),
    });

    getCreatePayloadFromData.mockReturnValue({ id: mockFormData.toolId });
  });

  it('renders the header, subtitle and callout copy', () => {
    renderComponent();

    expect(screen.getByText('Create new tool')).toBeInTheDocument();
    expect(
      screen.getByText('This tool is saved to your tool library and attached to this agent.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'On save, this tool is added to this agent automatically. You can edit or remove it later from the Tools tab.'
      )
    ).toBeInTheDocument();
  });

  it('renders the tool form', () => {
    renderComponent();

    expect(screen.getByTestId('toolForm')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = jest.fn();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderComponent({ onClose });

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables "Save and attach" when the form has validation errors', () => {
    useToolForm.mockReturnValue({
      handleSubmit: (fn: (data: unknown) => void) => () => fn(mockFormData),
      formState: { errors: { toolId: { message: 'Required' } } },
    });

    renderComponent();

    expect(screen.getByRole('button', { name: 'Save and attach' })).toBeDisabled();
  });

  it('creates the tool with the payload built from the form data on save', async () => {
    const createTool = jest.fn();
    useCreateTool.mockReturnValue({ isSubmitting: false, createTool });

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderComponent();

    await user.click(screen.getByRole('button', { name: 'Save and attach' }));

    expect(getCreatePayloadFromData).toHaveBeenCalledWith(mockFormData);
    expect(createTool).toHaveBeenCalledWith({ id: mockFormData.toolId });
  });

  it('calls onToolCreated and onClose when the create mutation succeeds', () => {
    const onClose = jest.fn();
    const onToolCreated = jest.fn();
    renderComponent({ onClose, onToolCreated });

    const { onSuccess } = useCreateTool.mock.calls[0][0];
    const response = { id: mockFormData.toolId };
    onSuccess(response, mockFormData, undefined);

    expect(onToolCreated).toHaveBeenCalledWith(response);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
