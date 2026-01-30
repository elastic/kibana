/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditTagsAction } from './edit_tags_action';
import { IndividualTagsActionContextProvider } from '../contexts/individual_tags_action_context';
import { createPartialObjectMock } from '../utils/test';
import type { AlertActionsProps } from '../types';

describe('EditTagsAction', () => {
  const mockOpenFlyout = jest.fn();
  const mockOnActionExecuted = jest.fn();
  const mockAlert = {
    _id: 'test-alert-id',
    _index: 'test-index',
  };

  const defaultProps = createPartialObjectMock<AlertActionsProps>({
    alert: mockAlert as any,
    refresh: jest.fn(),
    onActionExecuted: mockOnActionExecuted,
  });

  const renderComponent = (props = defaultProps) => {
    return render(
      <IndividualTagsActionContextProvider
        value={{
          openFlyout: mockOpenFlyout,
          onClose: jest.fn(),
          isFlyoutOpen: false,
          onSaveTags: jest.fn(),
          selectedAlerts: [],
          getAction: jest.fn(),
        }}
      >
        <EditTagsAction {...props} />
      </IndividualTagsActionContextProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the edit tags menu item', () => {
    renderComponent();

    expect(screen.getByTestId('editTags')).toBeInTheDocument();
    expect(screen.getByText('Edit tags')).toBeInTheDocument();
  });

  it('should call openFlyout with the alert when clicked', async () => {
    renderComponent();

    const menuItem = screen.getByTestId('editTags');
    await userEvent.click(menuItem);

    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);
    expect(mockOpenFlyout).toHaveBeenCalledWith([mockAlert]);
  });

  it('should call onActionExecuted when clicked', async () => {
    renderComponent();

    const menuItem = screen.getByTestId('editTags');
    await userEvent.click(menuItem);

    expect(mockOnActionExecuted).toHaveBeenCalledTimes(1);
  });

  it('should not throw when onActionExecuted is not provided', async () => {
    const propsWithoutCallback = createPartialObjectMock<AlertActionsProps>({
      alert: mockAlert as any,
      refresh: jest.fn(),
    });

    renderComponent(propsWithoutCallback);

    const menuItem = screen.getByTestId('editTags');
    await userEvent.click(menuItem);

    expect(mockOpenFlyout).toHaveBeenCalledTimes(1);
  });
});
