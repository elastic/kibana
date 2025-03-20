/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { AppMockRenderer, createAppMockRenderer } from '../../test_utils';
import { CreateConnectorFilter } from './create_connector_filter';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('CreateConnectorFilter', () => {
  let appMockRenderer: AppMockRenderer;
  const mockOnSearchValueChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <CreateConnectorFilter searchValue="" onSearchValueChange={mockOnSearchValueChange} />
    );

    expect(screen.getByTestId('createConnectorsModalSearch')).toBeInTheDocument();
  });

  it('mockOnSearchValueChange is called correctly', async () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <CreateConnectorFilter searchValue="" onSearchValueChange={mockOnSearchValueChange} />
    );

    await userEvent.click(await screen.findByTestId('createConnectorsModalSearch'));
    await userEvent.paste('Test');

    expect(mockOnSearchValueChange).toHaveBeenCalledWith('Test');
  });
});
