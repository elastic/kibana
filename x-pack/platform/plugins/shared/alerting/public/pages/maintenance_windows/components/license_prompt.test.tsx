/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { AppMockRenderer, createAppMockRenderer } from '../../../lib/test_utils';
import { LicensePrompt } from './license_prompt';

describe('LicensePrompt', () => {
  let appMockRenderer: AppMockRenderer;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('it renders', () => {
    appMockRenderer = createAppMockRenderer();
    appMockRenderer.render(<LicensePrompt />);

    expect(screen.getByTestId('license-prompt-title')).toBeInTheDocument();
    expect(screen.getByTestId('license-prompt-upgrade')).toBeInTheDocument();
    expect(screen.getByTestId('license-prompt-trial')).toBeInTheDocument();
  });
});
