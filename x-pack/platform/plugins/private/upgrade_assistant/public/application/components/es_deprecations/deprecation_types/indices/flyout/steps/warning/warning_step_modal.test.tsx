/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  EnrichedDeprecationInfo,
  IndexWarning,
  IndexWarningType,
  ReindexStatus,
} from '../../../../../../../../../common/types';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { WarningModalStep } from './warning_step_modal';

// Mocks
jest.mock('../../../../../../../app_context', () => ({
  useAppContext: () => ({
    services: {
      api: {
        useLoadNodeDiskSpace: () => ({ data: [] }),
      },
      core: {
        docLinks: { links: {} },
      },
    },
  }),
}));

jest.mock('./warning_step_checkbox', () => ({
  DeprecatedSettingWarningCheckbox: ({ isChecked, onChange, id }: any) => (
    <input type="checkbox" checked={isChecked} onChange={onChange} id={id} data-testid={id} />
  ),
  ReplaceIndexWithAliasWarningCheckbox: ({ isChecked, onChange, id }: any) => (
    <input type="checkbox" checked={isChecked} onChange={onChange} id={id} data-testid={id} />
  ),
  MakeIndexReadonlyWarningCheckbox: ({ isChecked, onChange, id }: any) => (
    <input type="checkbox" checked={isChecked} onChange={onChange} id={id} data-testid={id} />
  ),
}));

jest.mock('../callouts', () => ({
  FollowerIndexCallout: () => <div data-testid="FollowerIndexCallout" />,
  ESTransformsTargetCallout: () => <div data-testid="ESTransformsTargetCallout" />,
  MlAnomalyCallout: () => <div data-testid="MlAnomalyCallout" />,
  FetchFailedCallOut: ({ errorMessage }: any) => (
    <div data-testid="FetchFailedCallOut">{errorMessage}</div>
  ),
}));

jest.mock('../../../../../common/nodes_low_disk_space', () => ({
  NodesLowSpaceCallOut: () => <div data-testid="NodesLowSpaceCallOut" />,
}));

// Define a local mock ReindexState type for testing
const mockReindexState = {
  status: ReindexStatus.inProgress,
  meta: {
    indexName: 'test-index',
    reindexName: 'test-index-reindex',
    aliases: [],
    isFrozen: false,
    isReadonly: false,
    isInDataStream: false,
    isClosedIndex: false,
    isFollowerIndex: false,
  },
  errorMessage: '',
  loadingState: 'idle' as any, // type assertion workaround for tests
  reindexTaskPercComplete: null, // valid value for number | null
};

const mockDeprecation: EnrichedDeprecationInfo = {
  type: 'index' as any,
  level: 'warning',
  resolveDuringUpgrade: false,
  url: '',
  message: 'Deprecation message',
  correctiveAction: undefined,
};

const mockWarnings: IndexWarning[] = [
  { warningType: 'indexSetting' as IndexWarningType, meta: {}, flow: 'readonly' },
  { warningType: 'replaceIndexWithAlias' as IndexWarningType, meta: {}, flow: 'readonly' },
];

const baseProps = {
  closeModal: jest.fn(),
  confirm: jest.fn(),
  meta: {
    indexName: 'test-index',
    reindexName: 'test-index-reindex',
    aliases: [],
    isReadonly: false,
    isFrozen: false,
    isInDataStream: false,
    isFollowerIndex: false,
  },
  warnings: mockWarnings,
  deprecation: mockDeprecation,
  reindexState: mockReindexState,
  flow: 'readonly' as const,
};

describe('WarningModalStep', () => {
  it('renders read-only modal and disables continue until all checkboxes are checked', () => {
    const { container } = renderWithI18n(<WarningModalStep {...baseProps} />);
    expect(screen.getByText(/Set index to read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Old indices can maintain compatibility/i)).toBeInTheDocument();
    const continueBtn = screen.getByRole('button', { name: /Set to read-only/i });
    expect(continueBtn).toBeDisabled();
    // Check all checkboxes
    const checkboxes = container.querySelectorAll(
      'input[type="checkbox"][data-testid^="reindexWarning-"]'
    );
    checkboxes.forEach((checkbox) => {
      fireEvent.click(checkbox);
    });
    expect(continueBtn).not.toBeDisabled();
  });

  it('calls confirm when continue is clicked in read-only flow', () => {
    const { container } = renderWithI18n(<WarningModalStep {...baseProps} />);
    const checkboxes = container.querySelectorAll(
      'input[type="checkbox"][data-testid^="reindexWarning-"]'
    );
    checkboxes.forEach((checkbox) => {
      fireEvent.click(checkbox);
    });
    const continueBtn = screen.getByRole('button', { name: /Set to read-only/i });
    fireEvent.click(continueBtn);
    expect(baseProps.confirm).toHaveBeenCalled();
  });

  it('renders unfreeze modal with correct title and button', () => {
    renderWithI18n(
      <WarningModalStep
        {...baseProps}
        flow="unfreeze"
        warnings={[]}
        deprecation={mockDeprecation}
      />
    );
    expect(screen.getByTestId('updateIndexModalTitle')).toHaveTextContent(/Unfreeze index/i);
    expect(screen.getByRole('button', { name: /Unfreeze index/i })).toBeInTheDocument();
  });

  it('calls confirm when continue is clicked in unfreeze flow', () => {
    renderWithI18n(
      <WarningModalStep
        {...baseProps}
        flow="unfreeze"
        warnings={[]}
        deprecation={mockDeprecation}
      />
    );
    const continueBtn = screen.getByRole('button', { name: /Unfreeze index/i });
    fireEvent.click(continueBtn);
    expect(baseProps.confirm).toHaveBeenCalled();
  });

  it('calls closeModal when cancel is clicked', () => {
    renderWithI18n(<WarningModalStep {...baseProps} />);
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(baseProps.closeModal).toHaveBeenCalled();
  });
});
