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
    const { getByTestId } = renderComponent({
      onEdit: jest.fn(),
      onRemove: jest.fn(),
    });

    expect(getByTestId('dataFederationMappingEditorEditField')).toBeInTheDocument();
    expect(getByTestId('dataFederationMappingEditorRemoveField')).toBeInTheDocument();
  });

  it('calls onEdit and onRemove when the corresponding buttons are clicked', () => {
    const onEdit = jest.fn();
    const onRemove = jest.fn();

    const { getByTestId } = renderComponent({
      onEdit,
      onRemove,
    });

    fireEvent.click(getByTestId('dataFederationMappingEditorEditField'));
    expect(onEdit).toHaveBeenCalledTimes(1);

    fireEvent.click(getByTestId('dataFederationMappingEditorRemoveField'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  // Copy button intentionally removed
});
