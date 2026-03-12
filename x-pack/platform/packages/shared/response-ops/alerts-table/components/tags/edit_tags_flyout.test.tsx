/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, waitFor, screen } from '@testing-library/react';
import type { Alert } from '@kbn/alerting-types';
import { EditTagsFlyout } from './edit_tags_flyout';

describe('EditTagsFlyout', () => {
  const mockAlert = {
    _id: 'alert-1',
    version: 'v1',
    _index: 'test-index',
    title: 'Test Alert',
    'kibana.alert.workflow_tags': ['coke', 'pepsi'],
  } as unknown as Alert;

  const props = {
    selectedAlerts: [mockAlert],
    onClose: jest.fn(),
    onSaveTags: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(<EditTagsFlyout {...props} />);

    expect(await screen.findByTestId('alerts-edit-tags-flyout')).toBeInTheDocument();
    expect(await screen.findByTestId('alerts-edit-tags-flyout-title')).toBeInTheDocument();
    expect(await screen.findByTestId('alerts-edit-tags-flyout-cancel')).toBeInTheDocument();
    expect(await screen.findByTestId('alerts-edit-tags-flyout-submit')).toBeInTheDocument();
  });

  it('calls onClose when pressing the cancel button', async () => {
    render(<EditTagsFlyout {...props} />);

    await userEvent.click(await screen.findByTestId('alerts-edit-tags-flyout-cancel'));

    await waitFor(() => {
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  it('calls onSaveTags when pressing the save selection button', async () => {
    render(<EditTagsFlyout {...props} />);

    expect(await screen.findByText('coke')).toBeInTheDocument();

    await userEvent.click(await screen.findByText('coke'));
    await userEvent.click(await screen.findByTestId('alerts-edit-tags-flyout-submit'));

    await waitFor(() => {
      expect(props.onSaveTags).toHaveBeenCalledWith({
        selectedItems: ['pepsi'],
        unSelectedItems: ['coke'],
      });
    });
  });

  it('shows the number of total selected alerts in the title', async () => {
    const mockAlert2 = {
      ...mockAlert,
      _id: 'alert-2',
      title: 'Test Alert 2',
      'kibana.alert.workflow_tags': ['one', 'three'],
    } as unknown as Alert;

    render(<EditTagsFlyout {...props} selectedAlerts={[mockAlert, mockAlert2]} />);

    expect(await screen.findByText('Selected alerts: 2')).toBeInTheDocument();
  });
});
