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
import { ALL_SPACES_ID, UNKNOWN_SPACE } from '@kbn/spaces-plugin/common/constants';
import type { AccessibleSpacesResult } from '../../hooks/use_spaces';
import { useAccessibleSpaces } from '../../hooks/use_spaces';
import { DatasetSharedNotice } from './dataset_shared_notice';
import { DatasetSpacesBadge } from './dataset_spaces_badge';
import { DatasetSpacesPicker } from './dataset_spaces_picker';

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

  it('calls out a dataset that is in every space', () => {
    render(<DatasetSpacesBadge spaceIds={[ALL_SPACES_ID]} />, { wrapper: Wrapper });

    expect(screen.getByTestId('datasetSpacesBadge')).toHaveTextContent('All spaces');
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

  it('names the other spaces an edit reaches', () => {
    render(<DatasetSharedNotice spaceIds={['default', 'marketing']} action="edit-example" />, {
      wrapper: Wrapper,
    });

    const notice = screen.getByTestId('datasetSharedNotice');
    expect(notice).toHaveTextContent(
      'Changes to this example apply in all 2 spaces it belongs to.'
    );
    expect(notice).toHaveTextContent('It is also in Marketing.');
  });

  it('reports spaces the reader has no access to without naming them', () => {
    render(<DatasetSharedNotice spaceIds={['default', UNKNOWN_SPACE]} action="delete-example" />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('datasetSharedNotice')).toHaveTextContent(
      'It is also in 1 space you do not have access to.'
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

  it('replaces named spaces when all spaces is picked', async () => {
    const onChange = jest.fn();
    render(<DatasetSpacesPicker value={['default']} onChange={onChange} />, { wrapper: Wrapper });

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
    await userEvent.click(screen.getByRole('option', { name: 'All spaces' }));

    expect(onChange).toHaveBeenCalledWith([ALL_SPACES_ID]);
  });

  it('keeps spaces the caller cannot see attached to the dataset', async () => {
    const onChange = jest.fn();
    render(<DatasetSpacesPicker value={['default', UNKNOWN_SPACE]} onChange={onChange} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByText(/also in 1 space you cannot see/i)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('comboBoxSearchInput'));
    await userEvent.click(screen.getByRole('option', { name: 'Marketing' }));

    expect(onChange).toHaveBeenCalledWith(['default', 'marketing', UNKNOWN_SPACE]);
  });
});
