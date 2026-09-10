/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { AppMockRenderer } from '../../test_utils';
import { createAppMockRenderer } from '../../test_utils';
import { CreateConnectorFilter } from './create_connector_filter';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('CreateConnectorFilter', () => {
  let appMockRenderer: AppMockRenderer;
  const mockOnSearchValueChange = jest.fn();
  const mockOnSelectedFeatureIdsChange = jest.fn();
  const featureOptions = [
    { value: 'alerting', label: 'Alerting' },
    { value: 'cases', label: 'Cases' },
  ];

  const defaultProps = {
    searchValue: '',
    onSearchValueChange: mockOnSearchValueChange,
    selectedFeatureIds: [],
    onSelectedFeatureIdsChange: mockOnSelectedFeatureIdsChange,
    featureOptions,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  it('renders', async () => {
    appMockRenderer.render(<CreateConnectorFilter {...defaultProps} />);

    expect(screen.getByTestId('createConnectorsModalSearch')).toBeInTheDocument();
    expect(screen.getByTestId('createConnectorsModalFeatureFilter')).toBeInTheDocument();
  });

  it('mockOnSearchValueChange is called correctly', async () => {
    appMockRenderer.render(<CreateConnectorFilter {...defaultProps} />);

    await userEvent.click(await screen.findByTestId('createConnectorsModalSearch'));
    await userEvent.paste('Test');

    expect(mockOnSearchValueChange).toHaveBeenCalledWith('Test');
  });

  it('calls onSelectedFeatureIdsChange when a feature option is selected', async () => {
    appMockRenderer.render(<CreateConnectorFilter {...defaultProps} />);

    const comboBox = await screen.findByTestId('createConnectorsModalFeatureFilter');
    await userEvent.click(within(comboBox).getByRole('combobox'));

    await userEvent.click(await screen.findByText('Alerting'));

    expect(mockOnSelectedFeatureIdsChange).toHaveBeenCalledWith(['alerting']);
  });

  it('renders selected feature ids as chips', async () => {
    appMockRenderer.render(
      <CreateConnectorFilter {...defaultProps} selectedFeatureIds={['cases']} />
    );

    const comboBox = await screen.findByTestId('createConnectorsModalFeatureFilter');
    expect(within(comboBox).getByTitle('Cases')).toBeInTheDocument();
  });

  it('disables the feature filter when featureFilterDisabled is true', async () => {
    appMockRenderer.render(<CreateConnectorFilter {...defaultProps} featureFilterDisabled />);

    const comboBox = await screen.findByTestId('createConnectorsModalFeatureFilter');
    expect(within(comboBox).getByRole('combobox')).toBeDisabled();
  });
});
