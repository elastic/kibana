/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { NoPermissionPrompt } from './no_permission_prompt';

describe('NoPermissionPrompt', () => {
  it('renders the default rules-and-alerts title when no title is provided', () => {
    renderWithI18n(<NoPermissionPrompt />);
    expect(screen.getByTestId('noPermissionPrompt')).toHaveTextContent(
      'No permissions to read rules and alerts'
    );
  });

  it('renders a custom title when provided, overriding the default', () => {
    renderWithI18n(<NoPermissionPrompt title={<span>Missing rules privileges</span>} />);
    const prompt = screen.getByTestId('noPermissionPrompt');
    expect(prompt).toHaveTextContent('Missing rules privileges');
    expect(prompt).not.toHaveTextContent('No permissions to read rules and alerts');
  });
});
