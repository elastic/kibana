/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ChangeHistoryDefaultPreviewHeaderActions } from './change_history_default_preview_header_actions';
import { useChangeHistoryDetail } from '../../hooks/use_change_history_detail';
import { useChangeHistoryConfig } from '../../provider/use_change_history_config';
import type { ChangeHistoryDetail } from '../../types/change_history_detail';
import { TEST_OBJECT_ID, TEST_SNAPSHOT } from '../../test_utils/change_history_test_fixtures';
import { TestProvider } from '../../test_utils/test_providers';

jest.mock('../../provider/use_change_history_config', () => ({
  useChangeHistoryConfig: jest.fn(),
}));

jest.mock('../../hooks/use_change_history_detail', () => ({
  useChangeHistoryDetail: jest.fn(),
}));

jest.mock('./change_history_restore_button', () => ({
  ChangeHistoryRestoreButton: ({ change }: { change: ChangeHistoryDetail }) => (
    <button data-test-subj="changeHistoryRestoreButton">{`Restore ${change.id}`}</button>
  ),
}));

const mockUseChangeHistoryConfig = useChangeHistoryConfig as jest.Mock;
const mockUseChangeHistoryDetail = useChangeHistoryDetail as jest.Mock;

const buildChange = (id: string): ChangeHistoryDetail => ({
  id,
  timestamp: '2026-06-15T12:00:00.000Z',
  actor: { name: 'Alice' },
  action: 'Updated',
  snapshot: TEST_SNAPSHOT,
});

describe('ChangeHistoryDefaultPreviewHeaderActions', () => {
  beforeEach(() => {
    mockUseChangeHistoryConfig.mockReturnValue({
      adapter: {},
      objectId: TEST_OBJECT_ID,
      supports: { compare: true, restore: true, unsavedChanges: false },
    });
  });

  it('renders the Restore button when the loaded detail matches the selection', () => {
    mockUseChangeHistoryDetail.mockReturnValue({ change: buildChange('evt-2'), isLoading: false });

    render(<ChangeHistoryDefaultPreviewHeaderActions selectedChangeId="evt-2" />, {
      wrapper: TestProvider,
    });

    expect(screen.getByTestId('changeHistoryRestoreButton')).toHaveTextContent('Restore evt-2');
  });

  it('renders no Restore button while the detail is stale from the previous selection', () => {
    mockUseChangeHistoryDetail.mockReturnValue({ change: buildChange('evt-1'), isLoading: false });

    render(<ChangeHistoryDefaultPreviewHeaderActions selectedChangeId="evt-2" />, {
      wrapper: TestProvider,
    });

    expect(screen.queryByTestId('changeHistoryRestoreButton')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('changeHistoryDefaultPreviewHeaderActions')
    ).not.toBeInTheDocument();
  });
});
