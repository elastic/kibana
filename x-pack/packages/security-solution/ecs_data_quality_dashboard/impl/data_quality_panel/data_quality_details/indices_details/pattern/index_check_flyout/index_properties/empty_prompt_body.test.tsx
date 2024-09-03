/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { EmptyPromptBody } from './empty_prompt_body';
import { TestExternalProviders } from '../../../../../mock/test_providers/test_providers';

describe('EmptyPromptBody', () => {
  const content = 'foo bar baz @baz';

  test('it renders the expected content', () => {
    render(
      <TestExternalProviders>
        <EmptyPromptBody body={content} />
      </TestExternalProviders>
    );

    expect(screen.getByTestId('emptyPromptBody')).toHaveTextContent(content);
  });
});
