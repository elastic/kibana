/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';

import type { AppMockRenderer } from '../lib/test_utils';
import { createAppMockRenderer } from '../lib/test_utils';
import { EmptyPrompt } from './empty_prompt';

describe('EmptyPrompt', () => {
  let appMockRenderer: AppMockRenderer;

  const docLinks = docLinksServiceMock.createStartContract().links;
  const handleClickCreate = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
    appMockRenderer = createAppMockRenderer();
  });

  test('it renders', () => {
    const result = appMockRenderer.render(
      <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks} />
    );

    expect(result.getByText('Create your first maintenance window')).toBeInTheDocument();
    expect(
      result.getByText('Schedule a time period in which rule notifications cease.')
    ).toBeInTheDocument();
  });

  test('it renders an action button when showCreateButton is provided', () => {
    const result = appMockRenderer.render(
      <EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks} />
    );

    expect(result.getByRole('button')).toBeInTheDocument();
  });

  test('it does not render an action button when showCreateButton is not provided', () => {
    const result = appMockRenderer.render(
      <EmptyPrompt showCreateButton={false} onClickCreate={handleClickCreate} docLinks={docLinks} />
    );

    expect(result.queryByRole('button')).not.toBeInTheDocument();
  });
});
