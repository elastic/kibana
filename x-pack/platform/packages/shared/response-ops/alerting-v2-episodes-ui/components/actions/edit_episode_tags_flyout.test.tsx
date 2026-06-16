/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expressionsPluginMock } from '@kbn/expressions-plugin/public/mocks';
import { MAX_TAG_LENGTH, MAX_TAGS_PER_EPISODE } from '@kbn/alerting-v2-constants';
import { AlertEpisodeTagsFlyout } from './edit_episode_tags_flyout';
import { useFetchAlertEpisodeTagSuggestions } from '../../hooks/use_fetch_alert_episode_tag_suggestions';
import {
  createMockSpaces,
  createTestQueryClient,
  createQueryClientWrapper,
} from '../../hooks/test_utils';

jest.mock('../../hooks/use_fetch_alert_episode_tag_suggestions');

const useFetchAlertEpisodeTagSuggestionsMock = jest.mocked(useFetchAlertEpisodeTagSuggestions);

const mockExpressions = expressionsPluginMock.createStartContract();
const mockSpaces = createMockSpaces();

const queryClient = createTestQueryClient();
const queryWrapper = createQueryClientWrapper(queryClient);

describe('AlertEpisodeTagsFlyout', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSave: jest.fn(),
    currentTags: [] as string[],
    services: { expressions: mockExpressions, spaces: mockSpaces },
  };

  beforeEach(() => {
    useFetchAlertEpisodeTagSuggestionsMock.mockReturnValue({
      data: ['beta', 'gamma'],
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useFetchAlertEpisodeTagSuggestions>);
  });

  it('renders the flyout shell and tag toolbar when suggestions are ready', async () => {
    render(<AlertEpisodeTagsFlyout {...defaultProps} currentTags={['alpha']} />, {
      wrapper: queryWrapper,
    });

    expect(await screen.findByText('Edit Tags'));
    expect(screen.getByText(/Total tags:\s*3/)).toBeInTheDocument();
    expect(screen.getByText(/Selected:\s*1/)).toBeInTheDocument();
    expect(screen.getByTestId('alertingEpisodeTagsFlyout-select-all')).toBeInTheDocument();
    expect(screen.getByTestId('alertingEpisodeTagsFlyout-select-none')).toBeInTheDocument();
  });

  it('select all checks every known tag', async () => {
    const user = userEvent.setup();
    render(<AlertEpisodeTagsFlyout {...defaultProps} currentTags={[]} />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText(/Selected:\s*0/)).toBeInTheDocument();

    await user.click(screen.getByTestId('alertingEpisodeTagsFlyout-select-all'));

    expect(screen.getByText(/Selected:\s*2/)).toBeInTheDocument();
  });

  it('select none clears the selection', async () => {
    const user = userEvent.setup();
    render(<AlertEpisodeTagsFlyout {...defaultProps} currentTags={['alpha']} />, {
      wrapper: queryWrapper,
    });

    expect(screen.getByText(/Selected:\s*1/)).toBeInTheDocument();

    await user.click(screen.getByTestId('alertingEpisodeTagsFlyout-select-none'));

    expect(screen.getByText(/Selected:\s*0/)).toBeInTheDocument();
  });

  it('caps select all at the maximum number of tags per episode', async () => {
    const user = userEvent.setup();
    const manySuggestions = Array.from({ length: MAX_TAGS_PER_EPISODE + 5 }, (_, i) => `tag-${i}`);
    useFetchAlertEpisodeTagSuggestionsMock.mockReturnValue({
      data: manySuggestions,
      isLoading: false,
      isError: false,
      isSuccess: true,
    } as unknown as ReturnType<typeof useFetchAlertEpisodeTagSuggestions>);

    render(<AlertEpisodeTagsFlyout {...defaultProps} currentTags={[]} />, {
      wrapper: queryWrapper,
    });

    await user.click(screen.getByTestId('alertingEpisodeTagsFlyout-select-all'));

    expect(
      screen.getByText(new RegExp(`Selected:\\s*${MAX_TAGS_PER_EPISODE}`))
    ).toBeInTheDocument();
    expect(screen.queryByTestId('alertingEpisodeTagsFlyoutTooManyTagsWarning')).toBeInTheDocument();
  });

  it('shows an error and disables save when a selected tag exceeds the max length', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn();
    const longTag = 'x'.repeat(MAX_TAG_LENGTH + 1);
    render(
      <AlertEpisodeTagsFlyout {...defaultProps} onSave={mockOnSave} currentTags={[longTag]} />,
      {
        wrapper: queryWrapper,
      }
    );

    expect(
      await screen.findByTestId('alertingEpisodeTagsFlyoutTagTooLongError')
    ).toBeInTheDocument();
    expect(screen.getByText('Tag length limit exceeded')).toBeInTheDocument();
    expect(screen.getByTestId('alertingEpisodeTagsFlyoutSave')).toBeDisabled();

    await user.click(screen.getByTestId('alertingEpisodeTagsFlyoutSave'));

    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('calls onSave with the current tag selection and closes on save', async () => {
    const user = userEvent.setup();
    const mockOnSave = jest.fn();
    const mockOnClose = jest.fn();

    render(
      <AlertEpisodeTagsFlyout
        {...defaultProps}
        onClose={mockOnClose}
        currentTags={['alpha']}
        onSave={mockOnSave}
      />,
      { wrapper: queryWrapper }
    );

    await user.click(screen.getByTestId('alertingEpisodeTagsFlyoutSave'));

    expect(mockOnSave).toHaveBeenCalledWith(['alpha']);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('invokes onClose when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    render(<AlertEpisodeTagsFlyout {...defaultProps} onClose={onClose} />, {
      wrapper: queryWrapper,
    });

    await user.click(screen.getByTestId('alertingEpisodeTagsFlyoutCancel'));

    expect(onClose).toHaveBeenCalled();
  });
});
