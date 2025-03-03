/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../../mock';

import { TagsFilter } from './tags_filter';

describe('TagsFilter', () => {
  function render(props: any) {
    const renderer = createFleetTestRendererMock();

    return renderer.render(<TagsFilter {...props} />);
  }

  it('should remove one tag on clicking selected tag', async () => {
    const tags = ['tag1', 'tag2', 'tag3'];
    const selectedTags = ['tag1', 'tag2', 'tag3'];
    const onSelectedTagsChange = jest.fn();
    const props = {
      tags,
      selectedTags,
      onSelectedTagsChange,
    };
    const { getByText, getByTestId } = render(props);
    const filterButton = getByTestId('agentList.tagsFilter');
    filterButton.click();
    const tag = getByText('tag1');
    tag.click();
    expect(onSelectedTagsChange).toHaveBeenCalledWith(['tag2', 'tag3']);
  });
});
