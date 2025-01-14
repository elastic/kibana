/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';

import { useUpdateTags } from '../hooks';

import { TagsAddRemove } from './tags_add_remove';

jest.mock('../hooks', () => ({
  useUpdateTags: jest.fn().mockReturnValue({
    updateTags: jest.fn(),
    bulkUpdateTags: jest.fn(),
  }),
}));

describe('TagsAddRemove', () => {
  let allTags: string[];
  let selectedTags: string[];
  const button = document.createElement('button');
  const onTagsUpdated = jest.fn();
  const mockUpdateTags = useUpdateTags().updateTags as jest.Mock;
  const mockBulkUpdateTags = useUpdateTags().bulkUpdateTags as jest.Mock;
  const onClosePopover = jest.fn();

  beforeEach(() => {
    onTagsUpdated.mockReset();
    mockUpdateTags.mockReset();
    mockBulkUpdateTags.mockReset();
    allTags = ['tag1', 'tag2'];
    selectedTags = ['tag1'];
  });

  const renderComponent = (agentId?: string, agents?: string | string[]) => {
    return render(
      <I18nProvider>
        <TagsAddRemove
          agentId={agentId}
          agents={agents}
          allTags={allTags}
          selectedTags={selectedTags}
          button={button}
          onTagsUpdated={onTagsUpdated}
          onClosePopover={onClosePopover}
        />
      </I18nProvider>
    );
  };

  it('should add selected tag when previously unselected', async () => {
    mockUpdateTags.mockImplementation(() => {
      selectedTags = ['tag1', 'tag2'];
    });
    const result = renderComponent('agent1');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag2'));

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag1', 'tag2'],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should remove selected tag when previously selected', async () => {
    mockUpdateTags.mockImplementation(() => {
      selectedTags = [];
    });
    const result = renderComponent('agent1');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag1'));

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      [],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should show add new tag when not exactly found in search and allow to add the tag', () => {
    const result = renderComponent('agent1');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: 'tag' },
    });

    fireEvent.click(result.getByTestId('createTagBtn'));

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag1', 'tag'],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should show allow to add new tag when agent do not have any tags', () => {
    allTags = [];
    selectedTags = [];
    const result = renderComponent('agent1');
    const searchInput = result.getByTestId('addRemoveTags');

    fireEvent.input(searchInput, {
      target: { value: 'tag' },
    });

    fireEvent.click(result.getByTestId('createTagBtn'));

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag'],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should add new tag when not found in search and button clicked', () => {
    const result = renderComponent('agent1');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: 'newTag' },
    });

    fireEvent.click(result.getAllByText('Create a new tag "newTag"')[0].closest('button')!);

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag1', 'newTag'],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should add new tag by removing special chars', () => {
    const result = renderComponent('agent1');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: 'Tag-123: _myTag"' },
    });

    fireEvent.click(result.getAllByText('Create a new tag "Tag-123 _myTag"')[0].closest('button')!);

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag1', 'Tag-123 _myTag'],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should limit new tag to 20 length', () => {
    const result = renderComponent('agent1');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: '01234567890123456789123' },
    });

    fireEvent.click(
      result.getAllByText('Create a new tag "01234567890123456789"')[0].closest('button')!
    );

    expect(mockUpdateTags).toHaveBeenCalledWith(
      'agent1',
      ['tag1', '01234567890123456789'],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should add selected tag when previously unselected - bulk selection', async () => {
    mockBulkUpdateTags.mockImplementation(() => {
      selectedTags = ['tag1', 'tag2'];
    });
    const result = renderComponent(undefined, '');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag2'));

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      '',
      ['tag2'],
      [],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should remove selected tag when previously selected - bulk selection', async () => {
    mockBulkUpdateTags.mockImplementation(() => {
      selectedTags = [];
    });
    const result = renderComponent(undefined, ['agent1', 'agent2']);
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag1'));

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      ['agent1', 'agent2'],
      [],
      ['tag1'],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should add to selected tags on add if action not completed immediately', async () => {
    mockBulkUpdateTags.mockImplementation((agents, tagsToAdd, tagsToRemove, onSuccess) => {
      onSuccess(false);
    });
    const result = renderComponent(undefined, '');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag2'));

    expect(result.getByTitle('tag2').getAttribute('aria-checked')).toEqual('true');
  });

  it('should remove from selected tags on remove if action not completed immediately', async () => {
    mockBulkUpdateTags.mockImplementation((agents, tagsToAdd, tagsToRemove, onSuccess) => {
      onSuccess(false);
    });
    const result = renderComponent(undefined, '');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag1'));

    expect(result.getByTitle('tag1').getAttribute('aria-checked')).toEqual('false');
  });

  it('should add new tag when not found in search and button clicked - bulk selection', () => {
    const result = renderComponent(undefined, 'query');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: 'newTag' },
    });

    fireEvent.click(result.getAllByText('Create a new tag "newTag"')[0].closest('button')!);

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      'query',
      ['newTag'],
      [],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should add new tag twice quickly when not found in search and button clicked - bulk selection', () => {
    mockBulkUpdateTags.mockImplementation((agents, tagsToAdd, tagsToRemove, onSuccess) =>
      onSuccess(false)
    );

    const result = renderComponent(undefined, 'query');
    const searchInput = result.getByRole('combobox');

    fireEvent.input(searchInput, {
      target: { value: 'newTag' },
    });

    fireEvent.click(result.getAllByText('Create a new tag "newTag"')[0].closest('button')!);

    fireEvent.input(searchInput, {
      target: { value: 'newTag2' },
    });

    fireEvent.click(result.getAllByText('Create a new tag "newTag2"')[0].closest('button')!);

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      'query',
      ['newTag'],
      [],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      'query',
      ['newTag2'],
      [],
      expect.anything(),
      'Tag created',
      'Tag creation failed'
    );
  });

  it('should remove tags twice quickly on bulk selection', () => {
    selectedTags = ['tag1', 'tag2'];
    mockBulkUpdateTags.mockImplementation((agents, tagsToAdd, tagsToRemove, onSuccess) =>
      onSuccess(false)
    );

    const result = renderComponent(undefined, '');
    const getTag = (name: string) => result.getByText(name);

    fireEvent.click(getTag('tag1'));

    fireEvent.click(getTag('tag2'));

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      '',
      [],
      ['tag1'],
      expect.anything(),
      undefined,
      undefined
    );

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      '',
      [],
      ['tag2'],
      expect.anything(),
      undefined,
      undefined
    );
  });

  it('should make tag options button visible on mouse enter', async () => {
    const result = renderComponent('agent1');

    fireEvent.mouseEnter(result.getByText('tag1').closest('.euiFlexGroup')!);

    expect(result.getByRole('button').getAttribute('aria-label')).toEqual('Tag Options');

    fireEvent.mouseLeave(result.getByText('tag1').closest('.euiFlexGroup')!);

    expect(result.queryByRole('button')).not.toBeInTheDocument();
  });

  it('should remove from selected and all tags on delete if action not completed immediately', async () => {
    mockBulkUpdateTags.mockImplementation((agents, tagsToAdd, tagsToRemove, onSuccess) => {
      onSuccess(false);
    });
    const result = renderComponent('agent1');
    fireEvent.mouseEnter(result.getByText('tag1').closest('.euiFlexGroup')!);

    fireEvent.click(result.getByRole('button'));

    fireEvent.click(result.getByText('Delete tag').closest('button')!);

    expect(result.queryByTitle('tag1')).toBeNull();
  });

  it('should update selected and all tags on rename if action not completed immediately', async () => {
    mockBulkUpdateTags.mockImplementation((agents, tagsToAdd, tagsToRemove, onSuccess) => {
      onSuccess(false);
    });
    const result = renderComponent('agent1');
    fireEvent.mouseEnter(result.getByText('tag1').closest('.euiFlexGroup')!);

    fireEvent.click(result.getByRole('button'));

    const input = result.getByDisplayValue('tag1');
    fireEvent.input(input, {
      target: { value: 'newName' },
    });
    fireEvent.keyDown(input, {
      key: 'Enter',
    });

    expect(result.queryByTitle('tag1')).toBeNull();
    expect(result.getByText('newName')).toBeInTheDocument();
  });
});
