/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RowActionsMenu } from './row_actions_menu';

const DELETE_MODAL_CONFIG = {
  titleMessageId: 'xpack.osquery.test.deleteTitle',
  titleDefaultMessage: 'Delete this item?',
  bodyMessageId: 'xpack.osquery.test.deleteBody',
  bodyDefaultMessage: 'Are you sure?',
  cancelMessageId: 'xpack.osquery.test.cancelButton',
  cancelDefaultMessage: 'Cancel',
  confirmMessageId: 'xpack.osquery.test.confirmButton',
  confirmDefaultMessage: 'Confirm',
};

const defaultProps = {
  itemName: 'test-item',
  actionsAriaLabel: 'Actions for test-item',
  editLabel: 'Edit',
  duplicateLabel: 'Duplicate',
  deleteLabel: 'Delete',
  deleteModalConfig: DELETE_MODAL_CONFIG,
  canWrite: true,
  isReadOnly: false,
  onEdit: jest.fn(),
  onDuplicate: jest.fn(),
  onDelete: jest.fn().mockResolvedValue(undefined),
};

const renderWithIntl = (ui: React.ReactElement) =>
  render(React.createElement(IntlProvider, { locale: 'en' }, ui));

describe('RowActionsMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the actions button', () => {
    renderWithIntl(React.createElement(RowActionsMenu, defaultProps));
    expect(screen.getByLabelText('Actions for test-item')).toBeInTheDocument();
  });

  it('shows edit, duplicate, and delete options when canWrite is true', () => {
    renderWithIntl(React.createElement(RowActionsMenu, defaultProps));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('shows only edit when canWrite is false', () => {
    renderWithIntl(React.createElement(RowActionsMenu, { ...defaultProps, canWrite: false }));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows viewLabel instead of editLabel when canWrite is false and viewLabel is provided', () => {
    renderWithIntl(
      React.createElement(RowActionsMenu, { ...defaultProps, canWrite: false, viewLabel: 'View' })
    );
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows editLabel (not viewLabel) when canWrite is true', () => {
    renderWithIntl(
      React.createElement(RowActionsMenu, { ...defaultProps, canWrite: true, viewLabel: 'View' })
    );
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.queryByText('View')).not.toBeInTheDocument();
  });

  it('falls back to editLabel when canWrite is false and viewLabel is omitted', () => {
    renderWithIntl(React.createElement(RowActionsMenu, { ...defaultProps, canWrite: false }));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('shows viewLabel when isViewOnly is true even though canWrite is true', () => {
    renderWithIntl(
      React.createElement(RowActionsMenu, {
        ...defaultProps,
        canWrite: true,
        isViewOnly: true,
        viewLabel: 'View',
      })
    );
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('View')).toBeInTheDocument();
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    // A writer keeps duplicate on a view-only item; only the open affordance changes.
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('falls back to editLabel when isViewOnly is true but viewLabel is omitted', () => {
    renderWithIntl(
      React.createElement(RowActionsMenu, { ...defaultProps, canWrite: true, isViewOnly: true })
    );
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
  });

  it('uses the eye icon when showing viewLabel and the pencil icon otherwise', () => {
    const { unmount } = renderWithIntl(
      React.createElement(RowActionsMenu, { ...defaultProps, canWrite: false, viewLabel: 'View' })
    );
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('View').closest('button')).toContainHTML('data-euiicon-type="eye"');
    unmount();

    renderWithIntl(
      React.createElement(RowActionsMenu, { ...defaultProps, canWrite: true, viewLabel: 'View' })
    );
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('Edit').closest('button')).toContainHTML('data-euiicon-type="pencil"');
  });

  it('hides delete but shows duplicate when isReadOnly is true', () => {
    renderWithIntl(React.createElement(RowActionsMenu, { ...defaultProps, isReadOnly: true }));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));

    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('calls onEdit when edit is clicked', () => {
    renderWithIntl(React.createElement(RowActionsMenu, defaultProps));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));
    fireEvent.click(screen.getByText('Edit'));

    expect(defaultProps.onEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDuplicate when duplicate is clicked', () => {
    renderWithIntl(React.createElement(RowActionsMenu, defaultProps));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));
    fireEvent.click(screen.getByText('Duplicate'));

    expect(defaultProps.onDuplicate).toHaveBeenCalledTimes(1);
  });

  it('shows confirmation modal when delete is clicked', () => {
    renderWithIntl(React.createElement(RowActionsMenu, defaultProps));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));
    fireEvent.click(screen.getByText('Delete'));

    expect(screen.getByText('Delete this item?')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('calls onDelete when delete is confirmed', async () => {
    renderWithIntl(React.createElement(RowActionsMenu, defaultProps));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));
    fireEvent.click(screen.getByText('Delete'));

    fireEvent.click(screen.getByText('Confirm'));

    await waitFor(() => {
      expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
    });
  });

  it('closes the modal when cancel is clicked without deleting', () => {
    renderWithIntl(React.createElement(RowActionsMenu, defaultProps));
    fireEvent.click(screen.getByLabelText('Actions for test-item'));
    fireEvent.click(screen.getByText('Delete'));

    expect(screen.getByText('Delete this item?')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.queryByText('Delete this item?')).not.toBeInTheDocument();
    expect(defaultProps.onDelete).not.toHaveBeenCalled();
  });
});
