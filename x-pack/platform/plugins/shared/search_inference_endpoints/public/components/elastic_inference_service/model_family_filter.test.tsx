/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { ModelFamilyFilter } from './model_family_filter';
import type { MultiSelectFilterOption } from '../filter/multi_select_filter';

describe('ModelFamilyFilter', () => {
  const options: MultiSelectFilterOption[] = [
    { key: 'elastic', label: 'Elastic' },
    { key: 'openai', label: 'OpenAI' },
  ];

  it('renders the filter button with "Model family" label', () => {
    const { getByText } = render(
      <ModelFamilyFilter options={options} selectedOptionKeys={[]} onChange={jest.fn()} />
    );
    expect(getByText('Model family')).toBeInTheDocument();
  });

  it('renders the data-test-subj', () => {
    const { getByTestId } = render(
      <ModelFamilyFilter options={options} selectedOptionKeys={[]} onChange={jest.fn()} />
    );
    expect(getByTestId('modelFamilyFilterMultiselect')).toBeInTheDocument();
  });

  it('shows options when clicked', async () => {
    const { getByText } = render(
      <ModelFamilyFilter options={options} selectedOptionKeys={[]} onChange={jest.fn()} />
    );

    fireEvent.click(getByText('Model family'));

    await waitFor(() => {
      expect(getByText('Elastic')).toBeInTheDocument();
      expect(getByText('OpenAI')).toBeInTheDocument();
    });
  });

  it('calls onChange when an option is selected', async () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <ModelFamilyFilter options={options} selectedOptionKeys={[]} onChange={onChange} />
    );

    fireEvent.click(getByText('Model family'));
    fireEvent.click(getByText('Elastic'));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalled();
    });
  });
});
