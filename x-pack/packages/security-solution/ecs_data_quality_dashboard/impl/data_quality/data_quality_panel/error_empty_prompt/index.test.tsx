/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { TestProviders } from '../../mock/test_providers/test_providers';
import { ErrorEmptyPrompt } from '.';

describe('ErrorEmptyPrompt', () => {
  test('it renders the expected content', () => {
    const title = 'This is the title of this work';

    render(
      <TestProviders>
        <ErrorEmptyPrompt title={title} />
      </TestProviders>
    );

    expect(screen.getByTestId('errorEmptyPrompt').textContent?.includes(title)).toBe(true);
  });
});
