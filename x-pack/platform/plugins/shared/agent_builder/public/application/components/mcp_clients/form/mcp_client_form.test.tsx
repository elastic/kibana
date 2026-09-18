/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { FormProvider } from 'react-hook-form';
import { McpClientForm } from './mcp_client_form';
import { McpClientFormMode } from './types';
import { useMcpClientForm } from './use_mcp_client_form';

jest.mock('./mcp_logo_picker', () => ({
  McpLogoPicker: () => null,
}));

const TestForm = ({ mode }: { mode: McpClientFormMode }) => {
  const form = useMcpClientForm();

  return (
    <IntlProvider locale="en">
      <FormProvider {...form}>
        <McpClientForm mode={mode} onSubmit={jest.fn()} />
      </FormProvider>
    </IntlProvider>
  );
};

describe('McpClientForm', () => {
  it('renders the credentials step in create mode', () => {
    render(<TestForm mode={McpClientFormMode.CREATE} />);

    expect(screen.getByTestId('mcpClientConfidentialCheckbox')).toBeInTheDocument();
  });

  it('hides the credentials step in edit mode, since the client type is immutable', () => {
    render(<TestForm mode={McpClientFormMode.EDIT} />);

    expect(screen.queryByTestId('mcpClientConfidentialCheckbox')).not.toBeInTheDocument();
  });

  it.each([McpClientFormMode.CREATE, McpClientFormMode.EDIT])(
    'renders the details and redirect steps in %s mode',
    (mode) => {
      render(<TestForm mode={mode} />);

      expect(screen.getByTestId('mcpClientNameInput')).toBeInTheDocument();
      expect(screen.getByTestId('mcpClientRedirectTypeRadio')).toBeInTheDocument();
    }
  );

  it('supports adding and removing remote redirect URLs', async () => {
    const user = userEvent.setup();
    render(<TestForm mode={McpClientFormMode.CREATE} />);

    await user.click(screen.getByRole('radio', { name: /Remote/ }));
    expect(screen.getByTestId('mcpClientRemoteUri-0')).toBeInTheDocument();
    expect(screen.queryByTestId('mcpClientRemoteUri-1')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('mcpClientAddUri'));
    expect(screen.getByTestId('mcpClientRemoteUri-1')).toBeInTheDocument();

    await user.click(screen.getByTestId('mcpClientRemoveUri-1'));
    expect(screen.queryByTestId('mcpClientRemoteUri-1')).not.toBeInTheDocument();
  });
});
