/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { BulkActionsOverlay } from './bulk_actions_overlay';
import { BulkSnoozeModal } from './actions/bulk_snooze_modal';
import { BulkTagsModal } from './actions/bulk_tags_modal';

jest.mock('./actions/bulk_snooze_modal', () => ({
  BulkSnoozeModal: jest.fn(() => <div data-test-subj="bulkSnoozeModal" />),
}));
jest.mock('./actions/bulk_tags_modal', () => ({
  BulkTagsModal: jest.fn(() => <div data-test-subj="bulkTagsModal" />),
}));

const mockBulkSnoozeModal = jest.mocked(BulkSnoozeModal);
const mockBulkTagsModal = jest.mocked(BulkTagsModal);

const mockExpressions = expressionsPluginMock.createStartContract();
const baseProps = {
  onClose: jest.fn(),
  onApplySnooze: jest.fn(),
  onSaveTags: jest.fn(),
  expressions: mockExpressions,
};

beforeEach(() => jest.clearAllMocks());

describe('BulkActionsOverlay', () => {
  it('renders nothing when pendingBulkState is null', () => {
    const { container } = render(<BulkActionsOverlay {...baseProps} pendingBulkState={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders BulkSnoozeModal when action is snooze', () => {
    render(
      <BulkActionsOverlay
        {...baseProps}
        pendingBulkState={{ action: 'snooze', selectedDocIds: ['0'] }}
      />
    );
    expect(screen.getByTestId('bulkSnoozeModal')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkTagsModal')).not.toBeInTheDocument();
  });

  it('renders BulkTagsModal when action is tag', () => {
    render(
      <BulkActionsOverlay
        {...baseProps}
        pendingBulkState={{ action: 'tag', selectedDocIds: ['0'] }}
      />
    );
    expect(screen.getByTestId('bulkTagsModal')).toBeInTheDocument();
    expect(screen.queryByTestId('bulkSnoozeModal')).not.toBeInTheDocument();
  });

  it('passes onClose and onApplySnooze to BulkSnoozeModal', () => {
    const mockOnClose = jest.fn();
    const mockOnApplySnooze = jest.fn();
    render(
      <BulkActionsOverlay
        {...baseProps}
        onClose={mockOnClose}
        onApplySnooze={mockOnApplySnooze}
        pendingBulkState={{ action: 'snooze', selectedDocIds: ['0'] }}
      />
    );
    const { onApplySnooze } = mockBulkSnoozeModal.mock.calls[0][0];
    onApplySnooze('2026-05-01T00:00:00.000Z');
    expect(mockOnApplySnooze).toHaveBeenCalledWith('2026-05-01T00:00:00.000Z');
  });

  it('passes onClose and onSaveTags to BulkTagsModal', () => {
    const mockOnClose = jest.fn();
    const mockOnSaveTags = jest.fn();
    render(
      <BulkActionsOverlay
        {...baseProps}
        onClose={mockOnClose}
        onSaveTags={mockOnSaveTags}
        pendingBulkState={{ action: 'tag', selectedDocIds: ['0'] }}
      />
    );
    const { onSave } = mockBulkTagsModal.mock.calls[0][0];
    onSave(['tag-x']);
    expect(mockOnSaveTags).toHaveBeenCalledWith(['tag-x']);
  });
});
