/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { EnrichedDeprecationInfo } from '../../../../../../../../../common/types';
import type { IndexWarning } from '@kbn/reindex-service-plugin/common';
import { ReindexStatus } from '@kbn/upgrade-assistant-pkg-common';
import { LoadingState } from '../../../../../../types';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { WarningModalStep } from './warning_step_modal';

// Mocks
jest.mock('../../../../../../../app_context', () => {
  const actual = jest.requireActual('../../../../../../../app_context');

  return {
    ...actual,
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
  };
});

jest.mock('./warning_step_checkbox', () => ({
  DeprecatedSettingWarningCheckbox: ({
    isChecked,
    onChange,
    id,
  }: {
    isChecked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    id: string;
  }) => (
    <input type="checkbox" checked={isChecked} onChange={onChange} id={id} data-test-subj={id} />
  ),
  ReplaceIndexWithAliasWarningCheckbox: ({
    isChecked,
    onChange,
    id,
  }: {
    isChecked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    id: string;
  }) => (
    <input type="checkbox" checked={isChecked} onChange={onChange} id={id} data-test-subj={id} />
  ),
  MakeIndexReadonlyWarningCheckbox: ({
    isChecked,
    onChange,
    id,
  }: {
    isChecked: boolean;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    id: string;
  }) => (
    <input type="checkbox" checked={isChecked} onChange={onChange} id={id} data-test-subj={id} />
  ),
}));

jest.mock('../callouts', () => ({
  FollowerIndexCallout: () => <div data-test-subj="FollowerIndexCallout" />,
  ESTransformsTargetCallout: () => <div data-test-subj="ESTransformsTargetCallout" />,
  MlAnomalyCallout: () => <div data-test-subj="MlAnomalyCallout" />,
  FetchFailedCallOut: ({ errorMessage }: { errorMessage: string }) => (
    <div data-test-subj="FetchFailedCallOut">{errorMessage}</div>
  ),
}));

jest.mock('../../../../../common/nodes_low_disk_space', () => ({
  NodesLowSpaceCallOut: () => <div data-test-subj="NodesLowSpaceCallOut" />,
}));

const mockReindexState = {
  status: ReindexStatus.inProgress,
  loadingState: LoadingState.Success,
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
  errorMessage: null,
  reindexTaskPercComplete: null, // valid value for number | null
};

const mockDeprecation: EnrichedDeprecationInfo = {
  type: 'index_settings',
  level: 'warning',
  resolveDuringUpgrade: false,
  url: 'doc_url',
  message: 'Deprecation message',
  correctiveAction: undefined,
};

const mockWarnings: IndexWarning[] = [
  { warningType: 'indexSetting', meta: {}, flow: 'readonly' },
  { warningType: 'replaceIndexWithAlias', meta: {}, flow: 'readonly' },
];

const getBaseProps = () => ({
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
});

describe('WarningModalStep', () => {
  it('renders read-only modal and disables continue until all checkboxes are checked', () => {
    const props = getBaseProps();
    renderWithI18n(<WarningModalStep {...props} />);
    expect(screen.getByText(/Set index to read-only/i)).toBeInTheDocument();
    expect(screen.getByText(/Old indices can maintain compatibility/i)).toBeInTheDocument();
    const continueBtn = screen.getByRole('button', { name: /Set to read-only/i });
    expect(continueBtn).toBeDisabled();
    // Check all checkboxes
    const checkboxes = screen.getAllByTestId(/^reindexWarning-\d+$/);
    checkboxes.forEach((checkboxEl) => {
      fireEvent.click(checkboxEl);
    });
    expect(continueBtn).not.toBeDisabled();
  });

  it('calls confirm when continue is clicked in read-only flow', () => {
    const props = getBaseProps();
    renderWithI18n(<WarningModalStep {...props} />);
    const checkboxes = screen.getAllByTestId(/^reindexWarning-\d+$/);
    checkboxes.forEach((checkboxEl) => {
      fireEvent.click(checkboxEl);
    });
    const continueBtn = screen.getByRole('button', { name: /Set to read-only/i });
    fireEvent.click(continueBtn);
    expect(props.confirm).toHaveBeenCalledTimes(1);
  });

  it('renders unfreeze modal with correct title and button', () => {
    const props = getBaseProps();
    renderWithI18n(
      <WarningModalStep {...props} flow="unfreeze" warnings={[]} deprecation={mockDeprecation} />
    );
    expect(screen.getByTestId('updateIndexModalTitle')).toHaveTextContent(/Unfreeze index/i);
    expect(screen.getByRole('button', { name: /Unfreeze index/i })).toBeInTheDocument();
  });

  it('calls confirm when continue is clicked in unfreeze flow', () => {
    const props = getBaseProps();
    renderWithI18n(
      <WarningModalStep {...props} flow="unfreeze" warnings={[]} deprecation={mockDeprecation} />
    );
    const continueBtn = screen.getByRole('button', { name: /Unfreeze index/i });
    fireEvent.click(continueBtn);
    expect(props.confirm).toHaveBeenCalledTimes(1);
  });

  it('calls closeModal when cancel is clicked', () => {
    const props = getBaseProps();
    renderWithI18n(<WarningModalStep {...props} />);
    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);
    expect(props.closeModal).toHaveBeenCalledTimes(1);
  });
});
