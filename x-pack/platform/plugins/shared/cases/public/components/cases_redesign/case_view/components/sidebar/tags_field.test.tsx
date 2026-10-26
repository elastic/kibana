/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { waitFor, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { readCasesPermissions, renderWithTestingProviders } from '../../../../../common/mock';
import { useGetTags } from '../../../../../containers/use_get_tags';
import { MAX_LENGTH_PER_TAG } from '../../../../../../common/constants';
import type { TagsFieldProps } from './tags_field';
import { TagsField } from './tags_field';

jest.mock('../../../../../containers/use_get_tags');

const onSubmit = jest.fn();
const defaultProps: TagsFieldProps = {
  isLoading: false,
  onSubmit,
  tags: [],
};

describe('TagsField', () => {
  let user: UserEvent;

  const sampleTags = ['coke', 'pepsi'];

  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.resetAllMocks();

    user = userEvent.setup({
      advanceTimers: jest.advanceTimersByTime,
    });

    (useGetTags as jest.Mock).mockImplementation(() => ({
      data: sampleTags,
      refetch: jest.fn(),
    }));
  });

  it('renders the combo box directly, without an edit button', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />);

    expect(await screen.findByTestId('caseTags')).toBeInTheDocument();
    expect(screen.queryByTestId('tag-list-edit-button')).not.toBeInTheDocument();
  });

  it('persists an added tag immediately, with no confirm step', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste(`${sampleTags[0]}`);
    await user.keyboard('{enter}');

    await waitFor(() => expect(onSubmit).toBeCalledWith([sampleTags[0]]));
    expect(screen.queryByTestId('template-field-confirm-tags')).not.toBeInTheDocument();
    expect(screen.queryByTestId('template-field-cancel-tags')).not.toBeInTheDocument();
  });

  it('trims the tags before submitting', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste('dude      ');
    await user.keyboard('{enter}');

    await waitFor(() => expect(onSubmit).toBeCalledWith(['dude']));
  });

  it('adds a new tag to the tags already on the case', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} tags={['a']} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste('new');
    await user.keyboard('{enter}');

    await waitFor(() => expect(onSubmit).toBeCalledWith(['a', 'new']));
  });

  it('shows error when tag is empty', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste(' ');
    await user.keyboard('{enter}');

    expect(await screen.findByText('A tag must contain at least one non-space character.'));
  });

  it('shows error when tag is too long', async () => {
    const longTag = 'z'.repeat(MAX_LENGTH_PER_TAG + 1);

    renderWithTestingProviders(<TagsField {...defaultProps} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste(`${longTag}`);
    await user.keyboard('{enter}');

    expect(
      await screen.findByText(
        'The length of the tag is too long. The maximum length is 256 characters.'
      )
    );
  });

  it('disables the combo box when the user does not have update permissions', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />, {
      wrapperProps: { permissions: readCasesPermissions() },
    });

    expect(await screen.findByTestId('comboBoxSearchInput')).toBeDisabled();
  });

  it('reflects tags updated externally after mount', async () => {
    const { rerender } = renderWithTestingProviders(<TagsField {...defaultProps} tags={['a']} />);

    expect(await screen.findByTestId('comboBoxInput')).toHaveTextContent('a');

    rerender(<TagsField {...defaultProps} tags={['a', 'b']} />);

    await waitFor(() => {
      expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('b');
    });
  });

  it('keeps showing the committed tags rather than assuming success if the update never persists', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} tags={['a']} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste('new');
    await user.keyboard('{enter}');

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(['a', 'new']));

    // onSubmit is fire-and-forget from the field's perspective; the `tags` prop here never updates
    // (as if the mutation failed), so the field keeps displaying the last-known-good value rather
    // than an optimistic one that was never stored.
    expect(screen.getByTestId('comboBoxInput')).toHaveTextContent('a');
    expect(screen.getByTestId('comboBoxInput')).not.toHaveTextContent('new');
  });
});
