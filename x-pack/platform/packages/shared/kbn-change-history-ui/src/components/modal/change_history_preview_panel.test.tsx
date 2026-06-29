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
import { useChangeHistoryPreviewCompare } from '../../hooks/use_change_history_preview_compare';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import type { ChangeHistoryDetail } from '../../types/change_history_detail';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';

jest.mock('../../provider/use_change_history_config', () => ({
  useChangeHistoryConfig: jest.fn(),
}));

jest.mock('../../hooks/use_change_history_detail', () => ({
  useChangeHistoryDetail: jest.fn(),
}));

jest.mock('../../hooks/use_change_history_preview_compare', () => ({
  useChangeHistoryPreviewCompare: jest.fn(),
}));

const mockUseChangeHistoryConfig = useChangeHistoryConfig as jest.Mock;
const mockUseChangeHistoryDetail = useChangeHistoryDetail as jest.Mock;
const mockUseChangeHistoryPreviewCompare = useChangeHistoryPreviewCompare as jest.Mock;

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
      renderPreview: jest.fn(({ previousChange: compareChange }) => (
        <div data-test-subj="previewRender">
          {compareChange ? 'with-compare' : 'without-compare'}
        </div>
      )),
    });
  });

  it('passes the chronologically previous change to renderPreview', () => {
    mockUseChangeHistoryDetail.mockReturnValue({
      change: currentChange,
      isLoading: false,
      error: undefined,
    });
    mockUseChangeHistoryPreviewCompare.mockReturnValue({
      currentChange,
      previousChange,
      isLoadingCompareContext: false,
    });

    render(<ChangeHistoryPreviewPanel selectedChangeId="evt-current" listItems={listItems} />);

    expect(screen.getByTestId('changeHistoryPreviewFrame')).toBeInTheDocument();
    expect(screen.getByTestId('previewRender')).toHaveTextContent('with-compare');
    expect(mockUseChangeHistoryConfig().renderPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        change: currentChange,
        previousChange,
        objectId: 'workflow-1',
        isLoadingCompareContext: false,
      })
    );
  });

  it('does not pass compare change for the oldest loaded list item', () => {
    mockUseChangeHistoryDetail.mockReturnValue({
      change: previousChange,
      isLoading: false,
      error: undefined,
    });
    mockUseChangeHistoryPreviewCompare.mockReturnValue({
      currentChange,
      previousChange: undefined,
      isLoadingCompareContext: false,
    });

    render(<ChangeHistoryPreviewPanel selectedChangeId="evt-previous" listItems={listItems} />);

    expect(screen.getByTestId('previewRender')).toHaveTextContent('without-compare');
    expect(mockUseChangeHistoryConfig().renderPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        change: previousChange,
        previousChange: undefined,
        objectId: 'workflow-1',
      })
    );
  });
});
