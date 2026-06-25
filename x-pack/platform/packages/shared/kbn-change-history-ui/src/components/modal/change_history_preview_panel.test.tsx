/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChangeHistoryPreviewPanel } from './change_history_preview_panel';
import { useChangeHistoryDetail } from '../../hooks/use_change_history_detail';
import { useChangeHistoryListItems } from '../../provider/change_history_list_items_context';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import type { ChangeHistoryDetail } from '../../types/change_history_detail';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';

jest.mock('../../provider/use_change_history_config', () => ({
  useChangeHistoryConfig: jest.fn(),
}));

jest.mock('../../provider/change_history_list_items_context', () => ({
  useChangeHistoryListItems: jest.fn(),
}));

jest.mock('../../hooks/use_change_history_detail', () => ({
  useChangeHistoryDetail: jest.fn(),
}));

const mockUseChangeHistoryConfig = useChangeHistoryConfig as jest.Mock;
const mockUseChangeHistoryListItems = useChangeHistoryListItems as jest.Mock;
const mockUseChangeHistoryDetail = useChangeHistoryDetail as jest.Mock;

const listItems: ChangeHistoryListItem[] = [
  {
    id: 'evt-current',
    timestamp: '2026-06-16T12:00:00.000Z',
    actor: { name: 'Alice' },
    action: 'Updated',
  },
  {
    id: 'evt-previous',
    timestamp: '2026-06-15T12:00:00.000Z',
    actor: { name: 'System' },
    action: 'Created',
  },
];

const currentChange: ChangeHistoryDetail = {
  id: 'evt-current',
  timestamp: '2026-06-16T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  snapshot: { workflow: { yaml: 'name: current\n' } },
};

const previousChange: ChangeHistoryDetail = {
  id: 'evt-previous',
  timestamp: '2026-06-15T12:00:00.000Z',
  actor: { name: 'System' },
  action: 'Created',
  snapshot: { workflow: { yaml: 'name: original\n' } },
};

describe('ChangeHistoryPreviewPanel', () => {
  beforeEach(() => {
    mockUseChangeHistoryConfig.mockReturnValue({
      adapter: {},
      objectId: 'workflow-1',
      selectedChangeId: 'evt-current',
      renderPreview: jest.fn(({ compareChange }) => (
        <div data-test-subj="previewRender">
          {compareChange ? 'with-compare' : 'without-compare'}
        </div>
      )),
    });
    mockUseChangeHistoryListItems.mockReturnValue(listItems);
  });

  it('passes the chronologically previous change to renderPreview', () => {
    mockUseChangeHistoryDetail.mockImplementation(({ changeId, enabled }) => {
      if (!enabled) {
        return { change: undefined, isLoading: false, error: undefined };
      }

      if (changeId === 'evt-current') {
        return { change: currentChange, isLoading: false, error: undefined };
      }

      if (changeId === 'evt-previous') {
        return { change: previousChange, isLoading: false, error: undefined };
      }

      return { change: undefined, isLoading: false, error: undefined };
    });

    render(<ChangeHistoryPreviewPanel />);

    expect(screen.getByTestId('changeHistoryPreviewFrame')).toBeInTheDocument();
    expect(screen.getByTestId('previewRender')).toHaveTextContent('with-compare');
    expect(mockUseChangeHistoryDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        changeId: 'evt-previous',
        enabled: true,
      })
    );
    expect(mockUseChangeHistoryConfig().renderPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        change: currentChange,
        compareChange: previousChange,
        objectId: 'workflow-1',
      })
    );
  });

  it('does not fetch compare change for the oldest loaded list item', () => {
    mockUseChangeHistoryConfig.mockReturnValue({
      adapter: {},
      objectId: 'workflow-1',
      selectedChangeId: 'evt-previous',
      renderPreview: jest.fn(({ compareChange }) => (
        <div data-test-subj="previewRender">
          {compareChange ? 'with-compare' : 'without-compare'}
        </div>
      )),
    });

    mockUseChangeHistoryDetail.mockImplementation(({ changeId, enabled }) => {
      if (!enabled) {
        return { change: undefined, isLoading: false, error: undefined };
      }

      if (changeId === 'evt-previous') {
        return { change: previousChange, isLoading: false, error: undefined };
      }

      return { change: undefined, isLoading: false, error: undefined };
    });

    render(<ChangeHistoryPreviewPanel />);

    expect(screen.getByTestId('previewRender')).toHaveTextContent('without-compare');
    expect(mockUseChangeHistoryDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        changeId: undefined,
        enabled: false,
      })
    );
  });
});
