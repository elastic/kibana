/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { fireEvent, render } from '@testing-library/react';

import { MappingEditorHeader } from './mapping_editor_header';

describe('MappingEditorHeader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = (props: React.ComponentProps<typeof MappingEditorHeader>) => {
    return render(
      <EuiProvider>
        <MappingEditorHeader {...props} />
      </EuiProvider>
    );
  };

  it('renders the title and recommendation text', () => {
    const { getByText } = renderComponent({
      isAddFieldVisible: true,
      onAddField: jest.fn(),
      fieldSearch: '',
      onFieldSearchChange: jest.fn(),
    });

    expect(getByText('Mapped fields')).toBeInTheDocument();
    expect(
      getByText('Mapping your timestamp field and renaming it to @timestamp is recommended.')
    ).toBeInTheDocument();
  });

  it('calls onAddField when clicking "Add field"', () => {
    const onAddField = jest.fn();

    const { getByTestId } = renderComponent({
      isAddFieldVisible: true,
      onAddField,
      fieldSearch: '',
      onFieldSearchChange: jest.fn(),
    });

    fireEvent.click(getByTestId('dataFederationMappingEditorAddField'));
    expect(onAddField).toHaveBeenCalledTimes(1);
  });

  it('preserves Add field space when hidden', () => {
    const { getByTestId } = renderComponent({
      isAddFieldVisible: false,
      onAddField: jest.fn(),
      fieldSearch: '',
      onFieldSearchChange: jest.fn(),
    });

    const addButton = getByTestId('dataFederationMappingEditorAddField');
    const wrapper = addButton.closest('div[aria-hidden="true"]');

    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveStyle('visibility: hidden');
  });

  it('wires the field search input to onFieldSearchChange', () => {
    const onFieldSearchChange = jest.fn();

    const { getByTestId } = renderComponent({
      isAddFieldVisible: true,
      onAddField: jest.fn(),
      fieldSearch: 'sta',
      onFieldSearchChange,
    });

    const input = getByTestId('dataFederationMappingEditorSearchFields') as HTMLInputElement;
    expect(input.value).toBe('sta');

    fireEvent.change(input, { target: { value: 'status' } });
    expect(onFieldSearchChange).toHaveBeenCalledWith('status');
  });
});
