/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TagSelector, type TagSelectorProps } from './tag_selector';
import { I18nProvider } from '@kbn/i18n-react';

describe('tag selector', () => {
  const defaultProps: TagSelectorProps = {
    tags: [],
    selected: [],
    allowCreate: true,
    openCreateModal: jest.fn(),
    onTagsSelected: jest.fn(),
  };

  it('should exclude managed tags from the selection', async () => {
    const tags = [
      { id: '1', name: 'tag1', managed: false, color: 'blue', description: 'description' },
      { id: '2', name: 'tag2', managed: true, color: 'blue', description: 'description' },
      { id: '3', name: 'tag3', managed: false, color: 'blue', description: 'description' },
    ];

    render(
      <I18nProvider>
        <TagSelector {...defaultProps} tags={tags} />
      </I18nProvider>
    );

    await userEvent.click(screen.getByRole('button'));

    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.queryByText('tag2')).toBeNull();
    expect(screen.getByText('tag3')).toBeInTheDocument();
  });
});
