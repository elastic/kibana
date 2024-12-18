/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { MultiSelectFilter } from './multi_select_filter';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';

// Failing: See https://github.com/elastic/kibana/issues/183663
describe.skip('multi select filter', () => {
  it('should render the amount of options available', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags',
      buttonLabel: 'Tags',
      options: [
        { label: 'tag a', key: 'tag a' },
        { label: 'tag b', key: 'tag b' },
        { label: 'tag c', key: 'tag c' },
        { label: 'tag d', key: 'tag d' },
      ],
      onChange,
      isLoading: false,
    };

    render(<MultiSelectFilter {...props} />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-tags'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByText('4 options')).toBeInTheDocument();
  });

  it('hides the limit reached warning when a selected tag is removed', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags',
      buttonLabel: 'Tags',
      options: [
        { label: 'tag a', key: 'tag a' },
        { label: 'tag b', key: 'tag b' },
      ],
      onChange,
      selectedOptionKeys: ['tag a'],
      limit: 1,
      limitReachedMessage: 'Limit reached',
      isLoading: false,
    };

    const { rerender } = render(<MultiSelectFilter {...props} />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-tags'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByText('Limit reached')).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('option', { name: 'tag a' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ filterId: 'tags', selectedOptionKeys: [] });
    });

    rerender(<MultiSelectFilter {...props} selectedOptionKeys={[]} />);

    expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();
  });

  it('displays the limit reached warning when the maximum number of tags is selected', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags',
      buttonLabel: 'Tags',
      options: [
        { label: 'tag a', key: 'tag a' },
        { label: 'tag b', key: 'tag b' },
      ],
      onChange,
      selectedOptionKeys: ['tag a'],
      limit: 2,
      limitReachedMessage: 'Limit reached',
      isLoading: false,
    };

    const { rerender } = render(<MultiSelectFilter {...props} />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-tags'));
    await waitForEuiPopoverOpen();

    expect(screen.queryByText('Limit reached')).not.toBeInTheDocument();

    await userEvent.click(await screen.findByRole('option', { name: 'tag b' }));

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({
        filterId: 'tags',
        selectedOptionKeys: ['tag a', 'tag b'],
      });
    });

    rerender(<MultiSelectFilter {...props} selectedOptionKeys={['tag a', 'tag b']} />);

    expect(await screen.findByText('Limit reached')).toBeInTheDocument();
  });

  it('should not call onChange when the limit has been reached', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags',
      buttonLabel: 'Tags',
      options: [
        { label: 'tag a', key: 'tag a' },
        { label: 'tag b', key: 'tag b' },
      ],
      onChange,
      selectedOptionKeys: ['tag a'],
      limit: 1,
      limitReachedMessage: 'Limit reached',
      isLoading: false,
    };

    render(<MultiSelectFilter {...props} />);

    await userEvent.click(await screen.findByTestId('options-filter-popover-button-tags'));
    await waitForEuiPopoverOpen();

    expect(await screen.findByText('Limit reached')).toBeInTheDocument();

    await userEvent.click(await screen.findByRole('option', { name: 'tag b' }));

    await waitFor(() => {
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  it('should remove selected option if it suddenly disappeared from the list', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags',
      buttonLabel: 'Tags',
      options: [
        { label: 'tag a', key: 'tag a' },
        { label: 'tag b', key: 'tag b' },
      ],
      onChange,
      selectedOptionKeys: ['tag b'],
      isLoading: false,
    };

    const { rerender } = render(<MultiSelectFilter {...props} />);
    rerender(<MultiSelectFilter {...props} options={[{ key: 'tag a', label: 'tag a' }]} />);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith({ filterId: 'tags', selectedOptionKeys: [] });
    });
  });

  it('activates custom renderOption when set', async () => {
    const TEST_ID = 'test-render-option-id';
    const onChange = jest.fn();
    const renderOption = () => <div data-test-subj={TEST_ID} />;
    const props = {
      id: 'tags',
      buttonLabel: 'Tags',
      options: [
        { label: 'tag a', key: 'tag a' },
        { label: 'tag b', key: 'tag b' },
      ],
      onChange,
      renderOption,
      isLoading: false,
    };

    render(<MultiSelectFilter {...props} />);
    await userEvent.click(await screen.findByTestId('options-filter-popover-button-tags'));
    await waitForEuiPopoverOpen();
    expect((await screen.findAllByTestId(TEST_ID)).length).toBe(2);
  });

  it('should not show the amount of options if hideActiveOptionsNumber is active', async () => {
    const onChange = jest.fn();
    const props = {
      id: 'tags',
      buttonLabel: 'Tags',
      options: [
        { label: 'tag a', key: 'tag a' },
        { label: 'tag b', key: 'tag b' },
      ],
      onChange,
      selectedOptionKeys: ['tag b'],
      isLoading: false,
    };

    const { rerender } = render(<MultiSelectFilter {...props} />);
    expect(await screen.findByLabelText('1 active filters')).toBeInTheDocument();
    rerender(<MultiSelectFilter {...props} hideActiveOptionsNumber />);
    expect(screen.queryByLabelText('1 active filters')).not.toBeInTheDocument();
  });
});
