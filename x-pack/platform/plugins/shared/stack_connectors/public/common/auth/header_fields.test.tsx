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

import { HeaderFields } from './header_fields';

describe('HeaderFields', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one default header row', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeaderFields maxHeaders={20} readOnly={false} />
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
        <HeaderFields maxHeaders={20} readOnly={false} />
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
        <HeaderFields maxHeaders={20} readOnly={false} />
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

  it('renders config/secret options when clicking on the select type button', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeaderFields maxHeaders={20} readOnly={false} />
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
        <HeaderFields maxHeaders={20} readOnly={false} />
      </AuthFormTestProvider>
    );

    const typeSelector = await screen.findByTestId('webhookHeaderTypeSelect');
    await userEvent.click(typeSelector);
    await userEvent.click(await screen.findByTestId('option-secret'), { pointerEventsCheck: 0 });

    expect(await screen.findByTestId('webhookHeadersSecretValueInput')).toBeInTheDocument();
  });

  it('renders the encrypted headers badge when secret headers are present', async () => {
    render(
      <AuthFormTestProvider onSubmit={onSubmit}>
        <HeaderFields maxHeaders={20} readOnly={false} />
      </AuthFormTestProvider>
    );

    const typeSelector = await screen.findByTestId('webhookHeaderTypeSelect');
    await userEvent.click(typeSelector);
    await userEvent.click(await screen.findByTestId('option-secret'), { pointerEventsCheck: 0 });

    expect(await screen.findByTestId('encryptedHeadersBadge')).toBeInTheDocument();
  });

  it('does not render the add header button if the max number of headers is reached', async () => {
    const testData = {
      __internal__: {
        headers: [
          { key: 'config-header-1', value: 'config-value-1', type: 'config' },
          { key: 'config-header-2', value: 'config-value-2', type: 'config' },
          { key: 'secret-header-1', value: 'secret-value', type: 'secret' },
        ],
      },
    };
    render(
      <AuthFormTestProvider onSubmit={onSubmit} defaultValue={testData}>
        <HeaderFields maxHeaders={4} readOnly={false} />
      </AuthFormTestProvider>
    );
    const addBtn = await screen.findByTestId('webhookAddHeaderButton');
    await userEvent.click(addBtn);

    expect(screen.queryByTestId('webhookAddHeaderButton')).not.toBeInTheDocument();
    expect(screen.getByText('Maximum number of 4 headers reached.')).toBeInTheDocument();
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
          <HeaderFields maxHeaders={3} readOnly={false} />
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
          <HeaderFields maxHeaders={20} readOnly={false} />
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
          <HeaderFields maxHeaders={20} readOnly={false} />
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
  });

  describe('required is false', () => {
    it('is valid with empty key and value', async () => {
      const testData = {
        __internal__: {
          headers: [{ key: '', value: '', type: 'config' }],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testData} onSubmit={onSubmit}>
          <HeaderFields maxHeaders={20} readOnly={false} required={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: expect.objectContaining({
            __internal__: expect.objectContaining({
              headers: expect.arrayContaining([expect.objectContaining({ type: 'config' })]),
            }),
          }),
          isValid: true,
        });
      });
    });

    it('is valid with empty secret value and key is empty', async () => {
      const testData = {
        __internal__: {
          headers: [{ key: '', value: '', type: 'secret' }],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testData} onSubmit={onSubmit}>
          <HeaderFields maxHeaders={20} readOnly={false} required={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: expect.objectContaining({
            __internal__: expect.objectContaining({
              headers: expect.arrayContaining([expect.objectContaining({ type: 'secret' })]),
            }),
          }),
          isValid: true,
        });
      });
    });

    it('fails validation when key is present but value is empty', async () => {
      const testData = {
        __internal__: {
          headers: [{ key: 'some-key', value: '', type: 'config' }],
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testData} onSubmit={onSubmit}>
          <HeaderFields maxHeaders={20} readOnly={false} required={false} />
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
  });
});
