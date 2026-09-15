/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { TagsCache } from '../../services/tags/tags_cache';
import { createTagReference, createTag } from '../../../common/test_utils';
import { getConnectedTagListComponent } from './tag_list';

describe('getConnectedTagListComponent', () => {
  it('renders tag badges after the cache finishes initializing', async () => {
    const tagsCache = new TagsCache({
      refreshHandler: () => [createTag({ id: 'tag-1', name: 'Tag One' })],
    });
    const TagList = getConnectedTagListComponent({ cache: tagsCache });

    const { unmount } = render(<TagList object={{ references: [createTagReference('tag-1')] }} />);

    expect(screen.queryByText('Tag One')).not.toBeInTheDocument();

    await act(async () => {
      await tagsCache.initialize();
    });

    await waitFor(() => {
      expect(screen.getByText('Tag One')).toBeInTheDocument();
    });

    unmount();
    tagsCache.stop();
  });
});
