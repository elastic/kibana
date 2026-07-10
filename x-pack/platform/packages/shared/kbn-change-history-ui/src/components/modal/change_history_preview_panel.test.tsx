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
import { useChangeHistoryCompare } from '../../hooks/use_change_history_compare';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import type { ChangeHistoryCompareSpec } from '../../types/change_history_compare';
import type { ChangeHistoryDetail } from '../../types/change_history_detail';
import type { ChangeHistoryListItem } from '../../types/change_history_list_item';
import {
  TEST_OBJECT_ID,
  TEST_SNAPSHOT,
  TEST_SNAPSHOT_OLD,
} from '../../test_utils/change_history_test_fixtures';
import { TestProvider } from '../../test_utils/test_providers';

jest.mock('../../provider/use_change_history_config', () => ({
  useChangeHistoryConfig: jest.fn(),
}));

jest.mock('../../hooks/use_change_history_detail', () => ({
  useChangeHistoryDetail: jest.fn(),
}));

jest.mock('../../hooks/use_change_history_compare', () => ({
  useChangeHistoryCompare: jest.fn(),
}));

const mockUseChangeHistoryConfig = useChangeHistoryConfig as jest.Mock;
const mockUseChangeHistoryDetail = useChangeHistoryDetail as jest.Mock;
const mockUseChangeHistoryCompare = useChangeHistoryCompare as jest.Mock;

const listItems: ChangeHistoryListItem[] = [
  {
    id: 'evt-current',
    timestamp: '2026-06-16T12:00:00.000Z',
    actor: { name: 'Alice' },
    action: 'Updated',
    isCurrent: true,
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
  snapshot: TEST_SNAPSHOT,
};

const previousChange: ChangeHistoryDetail = {
  id: 'evt-previous',
  timestamp: '2026-06-15T12:00:00.000Z',
  actor: { name: 'System' },
  action: 'Created',
  snapshot: TEST_SNAPSHOT_OLD,
};

const vsPreviousCompareSpec: ChangeHistoryCompareSpec = {
  comparisonType: 'vs_previous',
  baseline: previousChange,
  target: currentChange,
};

const vsPreviousFromMiddleRowCompareSpec: ChangeHistoryCompareSpec = {
  comparisonType: 'vs_previous',
  baseline: previousChange,
  target: { ...previousChange, id: 'evt-middle' },
};

describe('ChangeHistoryPreviewPanel', () => {
  beforeEach(() => {
    mockUseChangeHistoryConfig.mockReturnValue({
      adapter: {},
      objectId: TEST_OBJECT_ID,
      supports: { compare: true, restore: false, unsavedChanges: false },
      telemetry: {
        reportDiffViewed: jest.fn(),
        reportDiffChangeNavigated: jest.fn(),
      },
      renderPreview: jest.fn(({ compareSpec }) => (
        <div data-test-subj="previewRender">{compareSpec ? 'with-compare' : 'without-compare'}</div>
      )),
    });
  });

  it('passes compareSpec to renderPreview when the current row is selected', () => {
    mockUseChangeHistoryDetail.mockReturnValue({
      change: currentChange,
      isLoading: false,
      error: undefined,
    });
    mockUseChangeHistoryCompare.mockReturnValue({
      compareSpec: vsPreviousCompareSpec,
      isLoadingCompareContext: false,
    });

    render(<ChangeHistoryPreviewPanel selectedChangeId="evt-current" listItems={listItems} />, {
      wrapper: TestProvider,
    });

    expect(screen.getByTestId('changeHistoryPreviewFrame')).toBeInTheDocument();
    expect(screen.getByTestId('previewRender')).toHaveTextContent('with-compare');
    expect(mockUseChangeHistoryConfig().renderPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        change: currentChange,
        compareSpec: vsPreviousCompareSpec,
        objectId: TEST_OBJECT_ID,
        isLoadingCompareContext: false,
      })
    );
  });

  it('passes vs_previous compareSpec for a non-current selection', () => {
    mockUseChangeHistoryDetail.mockReturnValue({
      change: previousChange,
      isLoading: false,
      error: undefined,
    });
    mockUseChangeHistoryCompare.mockReturnValue({
      compareSpec: vsPreviousFromMiddleRowCompareSpec,
      isLoadingCompareContext: false,
    });

    render(<ChangeHistoryPreviewPanel selectedChangeId="evt-previous" listItems={listItems} />, {
      wrapper: TestProvider,
    });

    expect(screen.getByTestId('previewRender')).toHaveTextContent('with-compare');
    expect(mockUseChangeHistoryConfig().renderPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        change: previousChange,
        compareSpec: vsPreviousFromMiddleRowCompareSpec,
        objectId: TEST_OBJECT_ID,
      })
    );
  });

  it('forwards compareOverride to useChangeHistoryCompare', () => {
    mockUseChangeHistoryDetail.mockReturnValue({
      change: previousChange,
      isLoading: false,
      error: undefined,
    });
    mockUseChangeHistoryCompare.mockReturnValue({
      compareSpec: vsPreviousFromMiddleRowCompareSpec,
      isLoadingCompareContext: false,
    });

    render(
      <ChangeHistoryPreviewPanel
        selectedChangeId="evt-previous"
        listItems={listItems}
        compareOverride={{ type: 'vs_row', rowChangeId: 'evt-current' }}
      />,
      { wrapper: TestProvider }
    );

    expect(mockUseChangeHistoryCompare).toHaveBeenCalledWith(
      expect.objectContaining({
        compareOverride: { type: 'vs_row', rowChangeId: 'evt-current' },
      })
    );
  });
});
