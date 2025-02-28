/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { renderWithTestingProviders } from '../../../common/mock';
import { EditTagsSelectable } from './edit_tags_selectable';
import { basicCase } from '../../../containers/mock';
import userEvent from '@testing-library/user-event';
import { waitFor, screen } from '@testing-library/react';

describe('EditTagsSelectable', () => {
  /**
   * Case has the following tags: coke, pepsi
   * All available tags are: one, two, coke, pepsi
   */
  const props = {
    selectedCases: [basicCase],
    isLoading: false,
    tags: ['one', 'two', ...basicCase.tags],
    onChangeTags: jest.fn(),
  };

  /**
   * Case one has the following tags: coke, pepsi, one
   * Case two has the following tags: one, three
   * All available tags are: one, two, three, coke, pepsi
   */
  const propsMultipleCases = {
    selectedCases: [
      { ...basicCase, tags: [...basicCase.tags, 'one'] },
      { ...basicCase, tags: ['one', 'three'] },
    ],
    isLoading: false,
    tags: ['one', 'two', 'three', ...basicCase.tags],
    onChangeTags: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} />);

    expect(screen.getByTestId('cases-actions-tags-edit-selectable')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    expect(screen.getByText(`Total tags: ${props.tags.length}`)).toBeInTheDocument();
    expect(screen.getByText('Selected: 2')).toBeInTheDocument();
    expect(screen.getByText('Select all')).toBeInTheDocument();
    expect(screen.getByText('Select none')).toBeInTheDocument();

    for (const tag of props.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it('renders the selected tags label correctly', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...propsMultipleCases} />);

    expect(screen.getByText('Total tags: 5')).toBeInTheDocument();
    expect(screen.getByText('Selected: 4')).toBeInTheDocument();

    for (const tag of props.tags) {
      expect(screen.getByText(tag)).toBeInTheDocument();
    }
  });

  it('renders the tags icons correctly', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...propsMultipleCases} />);

    for (const [tag, icon] of [
      ['one', 'check'],
      ['two', 'empty'],
      ['three', 'asterisk'],
      ['coke', 'asterisk'],
      ['pepsi', 'asterisk'],
    ]) {
      const iconDataTestSubj = `cases-actions-tags-edit-selectable-tag-${tag}-icon-${icon}`;
      expect(screen.getByTestId(iconDataTestSubj)).toBeInTheDocument();
    }
  });

  it('selects and unselects correctly tags with one case', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} />);

    for (const tag of props.tags) {
      await userEvent.click(screen.getByText(tag));
    }

    expect(props.onChangeTags).toBeCalledTimes(props.tags.length);
    expect(props.onChangeTags).nthCalledWith(props.tags.length, {
      selectedItems: ['one', 'two'],
      unSelectedItems: ['coke', 'pepsi'],
    });
  });

  it('selects and unselects correctly tags with multiple cases', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...propsMultipleCases} />);

    for (const tag of propsMultipleCases.tags) {
      await userEvent.click(screen.getByText(tag));
    }

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(propsMultipleCases.tags.length);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(propsMultipleCases.tags.length, {
      selectedItems: ['two', 'three', 'coke', 'pepsi'],
      unSelectedItems: ['one'],
    });
  });

  it('renders the icons correctly after selecting and deselecting tags', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...propsMultipleCases} />);

    for (const tag of propsMultipleCases.tags) {
      await userEvent.click(screen.getByText(tag));
    }

    for (const [tag, icon] of [
      ['one', 'empty'],
      ['two', 'check'],
      ['three', 'check'],
      ['coke', 'check'],
      ['pepsi', 'check'],
    ]) {
      const iconDataTestSubj = `cases-actions-tags-edit-selectable-tag-${tag}-icon-${icon}`;
      expect(screen.getByTestId(iconDataTestSubj)).toBeInTheDocument();
    }

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(propsMultipleCases.tags.length);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(propsMultipleCases.tags.length, {
      selectedItems: ['two', 'three', 'coke', 'pepsi'],
      unSelectedItems: ['one'],
    });
  });

  it('adds a new tag correctly', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} />);

    await userEvent.type(screen.getByPlaceholderText('Search'), 'not-exist', { delay: 1 });

    await waitFor(() => {
      expect(
        screen.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    const addNewTagButton = screen.getByTestId('cases-actions-tags-edit-selectable-add-new-tag');

    await userEvent.click(addNewTagButton);

    expect(props.onChangeTags).toBeCalledTimes(1);
    expect(props.onChangeTags).nthCalledWith(1, {
      selectedItems: ['not-exist', 'coke', 'pepsi'],
      unSelectedItems: [],
    });
  });

  it('selects all tags correctly', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...propsMultipleCases} />);

    expect(screen.getByText('Select all')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Select all'));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedItems: propsMultipleCases.tags,
      unSelectedItems: [],
    });
  });

  it('unselects all tags correctly', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...propsMultipleCases} />);

    expect(screen.getByText('Select all')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Select none'));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedItems: [],
      unSelectedItems: ['one', 'three', 'coke', 'pepsi'],
    });
  });

  it('unselects correctly with the new item presented', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...propsMultipleCases} />);

    /**
     * Tag with label "one" exist. Searching for "on" will show both the
     * "add new tag" item and the "one" tag
     */
    await userEvent.type(screen.getByPlaceholderText('Search'), 'on', { delay: 1 });

    await waitFor(() => {
      expect(
        screen.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    const iconDataTestSubj = 'cases-actions-tags-edit-selectable-tag-one-icon-check';
    expect(screen.getByTestId(iconDataTestSubj)).toBeInTheDocument();

    await userEvent.click(screen.getByTestId(iconDataTestSubj));

    expect(propsMultipleCases.onChangeTags).toBeCalledTimes(1);
    expect(propsMultipleCases.onChangeTags).nthCalledWith(1, {
      selectedItems: [],
      unSelectedItems: ['one'],
    });
  });

  it('adds a partial match correctly and does not show the no match label', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} />);

    /**
     * Tag with label "one" exist. Searching for "on" will show both the
     * "add new tag" item and the "one" tag
     */
    await userEvent.type(screen.getByPlaceholderText('Search'), 'on', { delay: 1 });

    await waitFor(() => {
      expect(
        screen.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).not.toBeInTheDocument();

    const addNewTagButton = screen.getByTestId('cases-actions-tags-edit-selectable-add-new-tag');

    await userEvent.click(addNewTagButton);

    expect(props.onChangeTags).toBeCalledTimes(1);
    expect(props.onChangeTags).nthCalledWith(1, {
      selectedItems: ['on', 'coke', 'pepsi'],
      unSelectedItems: [],
    });
  });

  it('do not show the new item option on exact match', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} />);

    await userEvent.type(screen.getByPlaceholderText('Search'), 'one', { delay: 1 });

    expect(
      screen.queryByTestId('cases-actions-tags-edit-selectable-add-new-tag')
    ).not.toBeInTheDocument();
  });

  it('does not show the no match label when the initial tags are empty', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} tags={[]} />);

    expect(
      screen.queryByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).not.toBeInTheDocument();
  });

  it('shows the no match label when there is no match', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} />);

    await userEvent.type(screen.getByPlaceholderText('Search'), 'not-exist', { delay: 1 });

    expect(
      screen.getByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).toBeInTheDocument();
  });

  it('shows the no match label and the add new item when there is space in the search term', async () => {
    renderWithTestingProviders(<EditTagsSelectable {...props} />);

    await userEvent.type(screen.getByPlaceholderText('Search'), 'test tag', { delay: 1 });

    await waitFor(() => {
      expect(
        screen.getByTestId('cases-actions-tags-edit-selectable-add-new-tag')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByTestId('cases-actions-tags-edit-selectable-no-match-label')
    ).toBeInTheDocument();
  });
});
