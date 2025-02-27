/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { docLinksServiceMock } from '@kbn/core-doc-links-server-mocks';

import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { EmptyPrompt } from './empty_prompt';

describe('EmptyPrompt', () => {
  let appMockRenderer: AppMockRenderer;

  const docLinks = docLinksServiceMock.createStartContract().links;
  const handleClickCreate = () => {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks} />);

    expect(screen.getByText('Create your first maintenance window')).toBeInTheDocument();
    expect(
      screen.getByText('Schedule a time period in which rule notifications cease.')
    ).toBeInTheDocument();
  });

  test('it renders an action button when showCreateButton is provided', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<EmptyPrompt onClickCreate={handleClickCreate} docLinks={docLinks} />);

    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('it does not render an action button when showCreateButton is not provided', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(
      <EmptyPrompt showCreateButton={false} onClickCreate={handleClickCreate} docLinks={docLinks} />
    );

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
