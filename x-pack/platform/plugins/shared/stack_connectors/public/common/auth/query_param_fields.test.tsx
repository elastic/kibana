/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryParamFields } from './query_param_fields';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';

describe('QueryParamFields', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders key and value fields', async () => {
    const defaultValue = {
      __internal__: {
        queryParams: [{ key: 'apiKey', value: 'secret' }],
      },
    };

    render(
      <AuthFormTestProvider defaultValue={defaultValue} onSubmit={onSubmit}>
        <QueryParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('httpQueryParamKeyInput')).toBeInTheDocument();
    expect(await screen.findByTestId('httpQueryParamValueInput')).toBeInTheDocument();
  });

  it('adds a new query param row when clicking add button', async () => {
    const defaultValue = {
      __internal__: {
        queryParams: [{ key: 'apiKey', value: 'secret' }],
      },
    };

    render(
      <AuthFormTestProvider defaultValue={defaultValue} onSubmit={onSubmit}>
        <QueryParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    await screen.findByTestId('httpAddQueryParamButton');
    await userEvent.click(screen.getByTestId('httpAddQueryParamButton'));

    await waitFor(() => {
      expect(screen.getAllByTestId('httpQueryParamKeyInput')).toHaveLength(2);
    });
  });

  it('removes a query param row when clicking delete', async () => {
    const defaultValue = {
      __internal__: {
        queryParams: [
          { key: 'key1', value: 'val1' },
          { key: 'key2', value: 'val2' },
        ],
      },
    };

    render(
      <AuthFormTestProvider defaultValue={defaultValue} onSubmit={onSubmit}>
        <QueryParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('httpQueryParamKeyInput')).toHaveLength(2);
    });

    const deleteButtons = screen.getAllByTestId('httpRemoveQueryParamButton');
    await userEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByTestId('httpQueryParamKeyInput')).toHaveLength(1);
    });
  });

  it('shows validation error for duplicate keys', async () => {
    const defaultValue = {
      __internal__: {
        queryParams: [
          { key: 'sameKey', value: 'val1' },
          { key: 'sameKey', value: 'val2' },
        ],
      },
    };

    render(
      <AuthFormTestProvider defaultValue={defaultValue} onSubmit={onSubmit}>
        <QueryParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    await screen.findByTestId('httpAddQueryParamButton');
    await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });

  it('shows validation error for empty key', async () => {
    const defaultValue = {
      __internal__: {
        queryParams: [{ key: '', value: 'val' }],
      },
    };

    render(
      <AuthFormTestProvider defaultValue={defaultValue} onSubmit={onSubmit}>
        <QueryParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    await screen.findByTestId('httpAddQueryParamButton');
    await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });

  it('shows validation error for empty value', async () => {
    const defaultValue = {
      __internal__: {
        queryParams: [{ key: 'apiKey', value: '' }],
      },
    };

    render(
      <AuthFormTestProvider defaultValue={defaultValue} onSubmit={onSubmit}>
        <QueryParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    await screen.findByTestId('httpAddQueryParamButton');
    await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });

  it('disables add and remove buttons when readOnly is true', async () => {
    const defaultValue = {
      __internal__: {
        queryParams: [{ key: 'apiKey', value: 'secret' }],
      },
    };

    render(
      <AuthFormTestProvider defaultValue={defaultValue} onSubmit={onSubmit}>
        <QueryParamFields readOnly={true} />
      </AuthFormTestProvider>
    );

    const addButton = await screen.findByTestId('httpAddQueryParamButton');
    expect(addButton).toBeDisabled();

    const deleteButton = await screen.findByTestId('httpRemoveQueryParamButton');
    expect(deleteButton).toBeDisabled();
  });
});
