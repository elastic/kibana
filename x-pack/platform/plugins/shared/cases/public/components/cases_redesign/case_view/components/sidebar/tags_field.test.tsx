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

  it('does not call onSubmit until the change is confirmed', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste(`${sampleTags[0]}`);
    await user.keyboard('{enter}');

    expect(onSubmit).not.toHaveBeenCalled();
    expect(await screen.findByTestId('template-field-confirm-tags')).toBeInTheDocument();
    expect(screen.getByTestId('template-field-cancel-tags')).toBeInTheDocument();

    await user.click(screen.getByTestId('template-field-confirm-tags'));

    await waitFor(() => expect(onSubmit).toBeCalledWith([sampleTags[0]]));
  });

  it('trims the tags on confirm', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste('dude      ');
    await user.keyboard('{enter}');

    await user.click(await screen.findByTestId('template-field-confirm-tags'));

    await waitFor(() => expect(onSubmit).toBeCalledWith(['dude']));
  });

  it('reverts the pending change when cancel is clicked', async () => {
    renderWithTestingProviders(<TagsField {...defaultProps} />);

    await user.click(await screen.findByRole('combobox'));
    await user.paste('new');
    await user.keyboard('{enter}');

    expect(await screen.findByTestId('comboBoxInput')).toHaveTextContent('new');

    await user.click(await screen.findByTestId('template-field-cancel-tags'));

    await waitFor(() => {
      expect(onSubmit).not.toBeCalled();
    });

    expect(screen.queryByTestId('template-field-confirm-tags')).not.toBeInTheDocument();
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
});
