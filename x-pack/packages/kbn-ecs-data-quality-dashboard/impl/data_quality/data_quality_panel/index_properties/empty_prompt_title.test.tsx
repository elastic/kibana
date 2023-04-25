/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { EmptyPromptTitle } from './empty_prompt_title';
import { TestProviders } from '../../mock/test_providers/test_providers';

describe('EmptyPromptTitle', () => {
  const title = 'What is a great title?';

  test('it renders the expected content', () => {
    render(
      <TestProviders>
        <EmptyPromptTitle title={title} />
      </TestProviders>
    );

    expect(screen.getByTestId('emptyPromptTitle')).toHaveTextContent(title);
  });
});
