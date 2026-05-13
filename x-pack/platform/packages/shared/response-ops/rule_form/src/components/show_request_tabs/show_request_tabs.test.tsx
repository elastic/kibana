/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShowRequestTabs } from './show_request_tabs';

describe('ShowRequestTabs', () => {
  const onTabChangeMock = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders both tabs', () => {
    render(<ShowRequestTabs activeTab="create" onTabChange={onTabChangeMock} />);

    expect(screen.getByTestId('showRequestCreateTab')).toBeInTheDocument();
    expect(screen.getByTestId('showRequestUpdateTab')).toBeInTheDocument();
  });

  test('marks the create tab as selected when activeTab is "create"', () => {
    render(<ShowRequestTabs activeTab="create" onTabChange={onTabChangeMock} />);

    expect(screen.getByTestId('showRequestCreateTab')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('showRequestUpdateTab')).toHaveAttribute('aria-selected', 'false');
  });

  test('marks the update tab as selected when activeTab is "update"', () => {
    render(<ShowRequestTabs activeTab="update" onTabChange={onTabChangeMock} />);

    expect(screen.getByTestId('showRequestCreateTab')).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByTestId('showRequestUpdateTab')).toHaveAttribute('aria-selected', 'true');
  });

  test('calls onTabChange with "create" when the create tab is clicked', async () => {
    render(<ShowRequestTabs activeTab="update" onTabChange={onTabChangeMock} />);

    await userEvent.click(screen.getByTestId('showRequestCreateTab'));

    expect(onTabChangeMock).toHaveBeenCalledWith('create');
  });

  test('calls onTabChange with "update" when the update tab is clicked', async () => {
    render(<ShowRequestTabs activeTab="create" onTabChange={onTabChangeMock} />);

    await userEvent.click(screen.getByTestId('showRequestUpdateTab'));

    expect(onTabChangeMock).toHaveBeenCalledWith('update');
  });
});
