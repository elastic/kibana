/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';

import { MappingActions } from './mapping_actions';
import type { MappingEditorField } from './mapping_editor';

const mockCopyToClipboard = jest.fn((text: string) => true);
jest.mock('@elastic/eui/test-env/services', () => {
  const actual = jest.requireActual('@elastic/eui/test-env/services');
  return {
    ...actual,
    copyToClipboard: (text: string) => mockCopyToClipboard(text),
  };
});

describe('MappingActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: React.ComponentProps<typeof MappingActions>) => {
    return render(
      <EuiProvider>
        <MappingActions {...props} />
      </EuiProvider>
    );
  };

  it('renders the provided type label', () => {
    const field: MappingEditorField = {
      id: '1',
      name: 'status_code',
      path: '',
      type: 'integer',
      format: '',
    };

    const { getByText } = renderComponent({
      field,
      isDate: false,
      typeLabel: 'Integer',
      onEdit: jest.fn(),
      onRemove: jest.fn(),
    });

    expect(getByText('Integer')).toBeInTheDocument();
  });

  it('falls back to the raw type when no type label is provided', () => {
    const field: MappingEditorField = {
      id: '1',
      name: 'status_code',
      path: '',
      type: 'integer',
      format: '',
    };

    const { getByText } = renderComponent({
      field,
      isDate: false,
      onEdit: jest.fn(),
      onRemove: jest.fn(),
    });

    expect(getByText('integer')).toBeInTheDocument();
  });

  it('calls onEdit and onRemove when the corresponding buttons are clicked', () => {
    const field: MappingEditorField = {
      id: '1',
      name: 'status_code',
      path: '',
      type: 'integer',
      format: '',
    };

    const onEdit = jest.fn();
    const onRemove = jest.fn();

    const { getByTestId } = renderComponent({
      field,
      isDate: false,
      typeLabel: 'Integer',
      onEdit,
      onRemove,
    });

    fireEvent.click(getByTestId('dataFederationMappingEditorEditField'));
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(getByTestId('dataFederationMappingEditorRemoveField'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('copies the expected JSON mapping when copy is clicked', () => {
    const field: MappingEditorField = {
      id: '1',
      name: '@timestamp',
      path: 'event_time',
      type: 'date',
      format: 'yyyy-MM-dd HH:mm:ss',
    };

    const expected = JSON.stringify(
      {
        [field.name]: {
          type: field.type,
          path: field.path,
          format: field.format,
        },
      },
      null,
      2
    );

    const { getByTestId } = renderComponent({
      field,
      isDate: true,
      typeLabel: 'Date',
      onEdit: jest.fn(),
      onRemove: jest.fn(),
    });

    fireEvent.click(getByTestId('dataFederationMappingEditorCopyField'));
    expect(mockCopyToClipboard).toHaveBeenCalledWith(expected);
  });
});
