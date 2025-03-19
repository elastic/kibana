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

describe('CreateConnectorFilter', () => {
  let appMockRenderer: AppMockRenderer;
  const mockOnSearchValueChange = jest.fn();

  beforeEach(() => {
    appMockRenderer = createAppMockRenderer();
    jest.clearAllMocks();
  });

  it('renders', async () => {
    appMockRenderer.render(
      <CreateConnectorFilter searchValue="" onSearchValueChange={mockOnSearchValueChange} />
    );

    expect(screen.getByTestId('createConnectorsModalSearch')).toBeInTheDocument();
  });
});
