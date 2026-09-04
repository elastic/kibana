/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { UNKNOWN_SPACE } from '@kbn/spaces-plugin/common';
import type { AccessibleSpacesResult } from '../../hooks/use_spaces';
import { useAccessibleSpaces } from '../../hooks/use_spaces';
import { DatasetSharedNotice } from './dataset_shared_notice';
import { DatasetSpacesBadge } from './dataset_spaces_badge';
import { DatasetSpacesPicker } from './dataset_spaces_picker';
import { SharedChangeConfirmModal } from './shared_change_confirm_modal';
import { getRemovedSpaceIds } from './use_dataset_sharing';

jest.mock('../../hooks/use_spaces');

const mockUseAccessibleSpaces = useAccessibleSpaces as jest.MockedFunction<
  typeof useAccessibleSpaces
>;

const setSpaces = (overrides: Partial<AccessibleSpacesResult> = {}) => {
  mockUseAccessibleSpaces.mockReturnValue({
    isEnabled: true,
    isLoading: false,
    activeSpaceId: 'default',
    spaces: [
      { id: 'default', name: 'Default' },
      { id: 'marketing', name: 'Marketing' },
      { id: 'sales', name: 'Sales' },
    ],
    ...overrides,
  });
};

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>{children}</I18nProvider>
);

beforeEach(() => {
  setSpaces();
});

describe('DatasetSpacesBadge', () => {
  it('stays out of the way for a dataset that only lives in this space', () => {
    const { container } = render(<DatasetSpacesBadge spaceIds={['default']} />, {
      wrapper: Wrapper,
    });

    expect(container.firstChild).toBeNull();
  });

  it('stays out of the way when the deployment has a single space', () => {
    setSpaces({ isEnabled: false, spaces: [], activeSpaceId: undefined });

    const { container } = render(<DatasetSpacesBadge spaceIds={['default', 'marketing']} />, {
      wrapper: Wrapper,
    });

    expect(container.firstChild).toBeNull();
  });

  it('counts the spaces a shared dataset reaches', () => {
    render(<DatasetSpacesBadge spaceIds={['default', 'marketing']} />, { wrapper: Wrapper });

    expect(screen.getByTestId('datasetSpacesBadge')).toHaveTextContent('2 spaces');
  });

  it('marks a dataset as shared even when the other space cannot be named', () => {
    render(<DatasetSpacesBadge spaceIds={['default', UNKNOWN_SPACE]} />, { wrapper: Wrapper });

    expect(screen.getByTestId('datasetSpacesBadge')).toHaveTextContent('2 spaces');
  });
});

describe('DatasetSharedNotice', () => {
  it('says nothing about a dataset nobody else can see', () => {
    const { container } = render(
      <DatasetSharedNotice spaceIds={['default']} action="edit-example" />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toBeNull();
  });

  it('counts how far an edit reaches', () => {
    render(<DatasetSharedNotice spaceIds={['default', 'marketing']} action="edit-example" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('datasetSharedNotice')).toHaveTextContent(
      'Changes to this example apply in the 2 spaces this dataset is shared with.'
    );
  });

  it('counts spaces the reader has no access to along with the rest', () => {
    render(<DatasetSharedNotice spaceIds={['default', UNKNOWN_SPACE]} action="delete-example" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('datasetSharedNotice')).toHaveTextContent(
      'This example will be deleted from the 2 spaces this dataset is shared with.'
    );
  });
});

describe('DatasetSpacesPicker', () => {
  it('is hidden when there is nowhere else to put a dataset', () => {
    setSpaces({ isEnabled: false, spaces: [], activeSpaceId: undefined });

    const { container } = render(<DatasetSpacesPicker value={['default']} onChange={jest.fn()} />, {
      wrapper: Wrapper,
    });

    expect(container.firstChild).toBeNull();
  });

  it('marks which space is the current one', () => {
    render(<DatasetSpacesPicker value={['default']} onChange={jest.fn()} />, { wrapper: Wrapper });

    expect(screen.getByText('Default (current)')).toBeInTheDocument();
  });

  it('offers the spaces themselves and no wildcard among them', async () => {
    render(<DatasetSpacesPicker value={[]} onChange={jest.fn()} />, { wrapper: Wrapper });

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));

    // A dataset for several spaces names each one, so there is nothing here
    // standing for spaces that don't exist yet.
    expect(screen.getAllByRole('option').map(({ textContent }) => textContent)).toEqual([
      'Default (current)',
      'Marketing',
      'Sales',
    ]);
  });

  it('keeps spaces the caller cannot see attached to the dataset, and counted', async () => {
    const onChange = jest.fn();
    render(
      <DatasetSpacesPicker value={['default', UNKNOWN_SPACE, UNKNOWN_SPACE]} onChange={onChange} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByText(/also in 2 spaces you cannot see/i)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
    await userEvent.click(screen.getByRole('option', { name: 'Marketing' }));

    expect(onChange).toHaveBeenCalledWith(['default', 'marketing', UNKNOWN_SPACE, UNKNOWN_SPACE]);
  });
});

describe('getRemovedSpaceIds', () => {
  it('reports the spaces an edit drops', () => {
    expect(getRemovedSpaceIds(['default', 'marketing'], ['default'])).toEqual(['marketing']);
  });

  it('leaves spaces the caller cannot see out of the removals', () => {
    expect(getRemovedSpaceIds(['default', UNKNOWN_SPACE], ['default'])).toEqual([]);
  });
});

describe('SharedChangeConfirmModal', () => {
  const renderModal = (props: Partial<React.ComponentProps<typeof SharedChangeConfirmModal>>) =>
    render(
      <SharedChangeConfirmModal
        spaceIds={['default', 'marketing']}
        action="edit-dataset"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
        {...props}
      />,
      { wrapper: Wrapper }
    );

  it('names the spaces an edit takes the dataset out of', () => {
    renderModal({ removedSpaceIds: ['marketing'], nextSpaceIds: ['default'] });

    expect(screen.getByTestId('datasetRemovedSpacesNotice')).toHaveTextContent(
      'It will no longer appear in Marketing.'
    );
  });

  it('counts the spaces a narrowed dataset is left in, not the ones it loses', () => {
    renderModal({
      spaceIds: ['default', 'marketing', 'sales'],
      removedSpaceIds: ['sales'],
      nextSpaceIds: ['default', 'marketing'],
    });

    // Saying the edit reaches all three would contradict the callout that just
    // said the dataset is leaving one of them.
    expect(screen.getByTestId('datasetSharedNotice')).toHaveTextContent(
      'the 2 spaces this dataset is shared with'
    );
  });

  it('asks plainly about an edit that takes no space away', () => {
    renderModal({ spaceIds: ['default', 'marketing'], nextSpaceIds: ['default', 'marketing'] });

    expect(screen.queryByTestId('datasetRemovedSpacesNotice')).not.toBeInTheDocument();
    expect(screen.getByTestId('datasetSharedNotice')).toHaveTextContent(
      'the 2 spaces this dataset is shared with'
    );
  });
});
