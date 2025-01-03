/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { renderReactTestingLibraryWithI18n } from '@kbn/test-jest-helpers';

import { useUpdateTags } from '../hooks';

import { TagOptions } from './tag_options';

jest.mock('../hooks', () => ({
  useUpdateTags: jest.fn().mockReturnValue({
    bulkUpdateTags: jest.fn(),
  }),
}));

describe('TagOptions', () => {
  const mockBulkUpdateTags = useUpdateTags().bulkUpdateTags as jest.Mock;
  const onTagsUpdated = jest.fn();
  let isTagHovered: boolean;

  beforeEach(() => {
    onTagsUpdated.mockReset();
    mockBulkUpdateTags.mockReset();
    mockBulkUpdateTags.mockResolvedValue({});
    isTagHovered = true;
  });

  const renderComponent = () => {
    return renderReactTestingLibraryWithI18n(
      <div>
        <TagOptions tagName={'agent'} isTagHovered={isTagHovered} onTagsUpdated={onTagsUpdated} />
      </div>
    );
  };

  it('should make menu button visible when tag is hovered', async () => {
    isTagHovered = false;
    const result = renderComponent();
    expect(result.container.querySelector('[aria-label="Tag Options"]')).toBeNull();

    isTagHovered = true;
    await waitFor(() => {
      expect(result.container.querySelector('[aria-label="Tag Options"]')).toBeDefined();
    });
  });

  it('should delete tag when delete button is clicked', () => {
    const result = renderComponent();

    fireEvent.click(result.getByRole('button'));

    fireEvent.click(result.getByText('Delete tag'));

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      'tags:"agent"',
      [],
      ['agent'],
      expect.anything(),
      'Tag deleted',
      'Tag delete failed'
    );
  });

  it('should rename tag when enter key is pressed', async () => {
    const result = renderComponent();

    fireEvent.click(result.getByRole('button'));

    const nameInput = result.getByDisplayValue('agent');
    fireEvent.input(nameInput, {
      target: { value: 'newName' },
    });
    fireEvent.keyDown(nameInput, {
      key: 'Enter',
    });

    expect(mockBulkUpdateTags).toHaveBeenCalledWith(
      'tags:"agent"',
      ['newName'],
      ['agent'],
      expect.anything(),
      'Tag renamed',
      'Tag rename failed'
    );
  });
});
