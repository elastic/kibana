/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { TruncatedText } from './truncated_text';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';

describe('TruncatedText', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<TruncatedText text="Test text" />);

    const text = screen.getByText('Test text');
    expect(text).toBeInTheDocument();
  });
});
