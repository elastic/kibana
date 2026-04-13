/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import type { WarningCheckboxProps } from './warnings';
import { ConfirmMigrationReindexFlyoutStep } from './reindex_confirm_step';
import {
  createWarnings,
  mockLoadNodeDiskSpace,
  mockMeta,
} from './test_utils/confirm_step_test_scaffold';

jest.mock('../../../../../../../app_context', () => {
  const actual = jest.requireActual('../../../../../../../app_context');

  return {
    ...actual,
    useAppContext: () => ({
      services: {
        api: {
          useLoadNodeDiskSpace: () => mockLoadNodeDiskSpace(),
        },
        core: {
          docLinks: {
            links: {
              upgradeAssistant: {
                dataStreamReindex: 'https://example.invalid/reindex-docs',
              },
            },
          },
        },
      },
    }),
  };
});

jest.mock('./warnings', () => ({
  IncompatibleDataInDataStreamWarningCheckbox: ({
    isChecked,
    onChange,
    id,
  }: WarningCheckboxProps) => (
    <input
      type="checkbox"
      checked={isChecked}
      onChange={onChange}
      id={id}
      data-test-subj={id}
      aria-label={id}
    />
  ),
  AffectExistingSetupsWarningCheckbox: ({ isChecked, onChange, id }: WarningCheckboxProps) => (
    <input
      type="checkbox"
      checked={isChecked}
      onChange={onChange}
      id={id}
      data-test-subj={id}
      aria-label={id}
    />
  ),
}));

jest.mock('../../../../../common/nodes_low_disk_space', () => ({
  NodesLowSpaceCallOut: () => <div data-test-subj="nodesLowDiskSpaceCallout" />,
}));

const mockWarnings = createWarnings('reindex');

describe('ConfirmMigrationReindexFlyoutStep', () => {
  beforeEach(() => {
    mockLoadNodeDiskSpace.mockReset();
    mockLoadNodeDiskSpace.mockReturnValue({ data: [] });
  });

  it('blocks start until all warning checkboxes are checked', () => {
    const startAction = jest.fn();

    renderWithI18n(
      <ConfirmMigrationReindexFlyoutStep
        closeFlyout={jest.fn()}
        startAction={startAction}
        warnings={mockWarnings}
        meta={mockMeta}
        lastIndexCreationDateFormatted="Tuesday, March 5th 2024, 1:02:03 pm"
      />
    );

    expect(screen.getByTestId('dataStreamMigrationWarningsCallout')).toBeInTheDocument();
    expect(screen.getByTestId('reindexDsWarningCallout')).toBeInTheDocument();

    const startButton = screen.getByTestId('startActionButton');
    expect(startButton).toBeDisabled();

    const checkboxes = screen.getAllByTestId(/^migrationWarning-\d+$/);
    expect(checkboxes).toHaveLength(2);
    checkboxes.forEach((checkboxEl) => fireEvent.click(checkboxEl));

    expect(startButton).not.toBeDisabled();
    fireEvent.click(startButton);
    expect(startAction).toHaveBeenCalled();
  });

  it('renders nodes low disk space callout when nodes are present', () => {
    mockLoadNodeDiskSpace.mockReturnValue({
      data: [
        {
          nodeName: 'node-1',
          availableBytes: 1024,
          lowDiskSpace: true,
          shards: ['shard-1'],
        },
      ],
    });

    renderWithI18n(
      <ConfirmMigrationReindexFlyoutStep
        closeFlyout={jest.fn()}
        startAction={jest.fn()}
        warnings={[]}
        meta={mockMeta}
        lastIndexCreationDateFormatted="Tuesday, March 5th 2024, 1:02:03 pm"
      />
    );

    expect(screen.getByTestId('nodesLowDiskSpaceCallout')).toBeInTheDocument();
  });
});
