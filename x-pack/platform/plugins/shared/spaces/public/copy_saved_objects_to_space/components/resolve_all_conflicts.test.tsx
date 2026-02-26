/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { I18nProvider } from '@kbn/i18n-react';

import type { ResolveAllConflictsProps } from './resolve_all_conflicts';
import { ResolveAllConflicts } from './resolve_all_conflicts';
import type { SummarizedCopyToSpaceResult } from '../lib';
import type { ImportRetry } from '../types';

const renderWithIntl = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('ResolveAllConflicts', () => {
  const summarizedCopyResult = {
    objects: [
      { type: 'type-1', id: 'id-1', conflict: undefined },
      { type: 'type-2', id: 'id-2', conflict: { error: { type: 'conflict' } } },
      {
        type: 'type-3',
        id: 'id-3',
        conflict: { error: { type: 'conflict', destinationId: 'dest-3' } },
      },
      {
        type: 'type-4',
        id: 'id-4',
        conflict: {
          error: {
            type: 'ambiguous_conflict',
            destinations: [{ id: 'dest-4a' }, { id: 'dest-4b' }],
          },
        },
      },
      {
        type: 'type-5',
        id: 'id-5',
        conflict: {
          error: {
            type: 'ambiguous_conflict',
            destinations: [{ id: 'dest-5a' }, { id: 'dest-5b' }],
          },
        },
      },
    ],
  } as unknown as SummarizedCopyToSpaceResult;
  const retries: ImportRetry[] = [
    { type: 'type-1', id: 'id-1', overwrite: false },
    { type: 'type-5', id: 'id-5', overwrite: true, destinationId: 'dest-5b' },
  ];
  const onRetriesChange = jest.fn();
  const onDestinationMapChange = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  const props: ResolveAllConflictsProps = {
    summarizedCopyResult,
    retries,
    onRetriesChange,
    onDestinationMapChange,
  };

  const openPopover = async () => {
    await userEvent.click(screen.getByText('(resolve all)'));
    await waitFor(() => {
      expect(screen.getByTestId('cts-resolve-all-conflicts-overwrite')).toBeInTheDocument();
    });
  };

  it('should render as expected', async () => {
    const { container } = renderWithIntl(<ResolveAllConflicts {...props} />);
    expect(screen.getByText('(resolve all)')).toBeInTheDocument();
    expect(container.children[0]).toMatchInlineSnapshot(`
      <div
        class="euiPopover emotion-euiPopover-inline-block"
        id="resolveAllConflictsVisibilityPopover"
      >
        <button
          class="euiLink emotion-euiLink-primary-ResolveAllButton"
          type="button"
        >
          (resolve all)
        </button>
      </div>
    `);
  });

  it('should add overwrite retries when "Overwrite all" is selected', async () => {
    renderWithIntl(<ResolveAllConflicts {...props} />);
    await openPopover();
    expect(onRetriesChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('cts-resolve-all-conflicts-overwrite'));
    expect(onRetriesChange).toHaveBeenCalledWith([
      { type: 'type-1', id: 'id-1', overwrite: false },
      { type: 'type-5', id: 'id-5', overwrite: true, destinationId: 'dest-5b' },
      { type: 'type-2', id: 'id-2', overwrite: true },
      { type: 'type-3', id: 'id-3', overwrite: true, destinationId: 'dest-3' },
      { type: 'type-4', id: 'id-4', overwrite: true, destinationId: 'dest-4a' },
    ]);
    expect(onDestinationMapChange).not.toHaveBeenCalled();
  });

  it('should remove overwrite retries when "Skip all" is selected', async () => {
    renderWithIntl(<ResolveAllConflicts {...props} />);
    await openPopover();
    expect(onRetriesChange).not.toHaveBeenCalled();
    expect(onDestinationMapChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByTestId('cts-resolve-all-conflicts-skip'));
    expect(onRetriesChange).toHaveBeenCalledWith([
      { type: 'type-1', id: 'id-1', overwrite: false },
    ]);
    expect(onDestinationMapChange).toHaveBeenCalledWith(undefined);
  });
});
