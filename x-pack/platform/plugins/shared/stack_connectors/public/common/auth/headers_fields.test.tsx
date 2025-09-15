/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';
import userEvent from '@testing-library/user-event';

import { HeadersFields } from './headers_fields';

describe('HeadersField', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one default header row', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeadersFields readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByText('HTTP headers')).toBeInTheDocument();

    expect(screen.getByTestId('webhookHeadersKeyInput')).toBeInTheDocument();
    expect(screen.getByTestId('webhookHeadersValueInput')).toBeInTheDocument();
    expect(screen.getByTestId('webhookHeaderTypeSelect')).toBeInTheDocument();
  });

  it('renders a new header when clicking on add button', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeadersFields readOnly={false} />
      </AuthFormTestProvider>
    );
    const addBtn = await screen.findByTestId('webhookAddHeaderButton');
    expect(addBtn).toBeInTheDocument();
    await userEvent.click(addBtn);

    const keyInputs = await screen.findAllByTestId('webhookHeadersKeyInput');
    expect(keyInputs.length).toBe(2);
  });

  it('removes header row when clicking on remove button', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeadersFields readOnly={false} />
      </AuthFormTestProvider>
    );

    // add a header
    const addBtn = await screen.findByTestId('webhookAddHeaderButton');
    await userEvent.click(addBtn);
    expect(await screen.findAllByTestId('webhookHeadersKeyInput')).toHaveLength(2);

    const removeBtns = await screen.findAllByTestId('webhookRemoveHeaderButton');
    await userEvent.click(removeBtns[0]);

    expect(await screen.findAllByTestId('webhookHeadersKeyInput')).toHaveLength(1);
  });

  // it renders config/secret as options when clicking on the type selector btn

  it('renders config/secret options when clicking on the select type button', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeadersFields readOnly={false} />
      </AuthFormTestProvider>
    );
    const typeSelector = await screen.findByTestId('webhookHeaderTypeSelect');
    await userEvent.click(typeSelector);

    expect(screen.getByTestId('option-config')).toBeInTheDocument();
    expect(screen.getByTestId('option-secret')).toBeInTheDocument();
  });

  it('switches value field to password when selection secret type', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeadersFields readOnly={false} />
      </AuthFormTestProvider>
    );

    const typeSelector = await screen.findByTestId('webhookHeaderTypeSelect');
    await userEvent.click(typeSelector);
    await userEvent.click(await screen.findByTestId('option-secret'), { pointerEventsCheck: 0 });

    expect(await screen.findByTestId('webhookHeadersSecretValueInput')).toBeInTheDocument();
  });

  describe('validation', () => {
    it('is valid with 1 config header and non-empty value', async () => {
      const testData = {
        __internal__: {
          headers: [{ key: 'config-test', value: 'config-value', type: 'config' }],
        },
      };
      render(
        <AuthFormTestProvider defaultValue={testData} onSubmit={onSubmit}>
          <HeadersFields readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: testData,
          isValid: true,
        });
      });
    });

    it('is valid with config headers and secret headers', async () => {
      const testData = {
        __internal__: {
          headers: [
            { key: 'config-key', value: 'config-value', type: 'config' },
            { key: 'secret-key', value: 'secret-value', type: 'secret' },
          ],
        },
      };
      render(
        <AuthFormTestProvider defaultValue={testData} onSubmit={onSubmit}>
          <HeadersFields readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: testData,
          isValid: true,
        });
      });
    });

    it('fails validation when secret header value is empty', async () => {
      const testData = {
        __internal__: {
          headers: [{ key: 'secret-key', value: '', type: 'secret' }],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testData} onSubmit={onSubmit}>
          <HeadersFields readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {},
          isValid: false,
        });
      });
    });

    // fails validation when config header and secret header have the same key
  });
});
