/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { RulesListPrompts } from './rules_list_prompts';

describe('RulesListPrompts', () => {
  const defaultProps = {
    showSpinner: false,
    showNoAuthPrompt: false,
    showCreateFirstRulePrompt: false,
    showCreateRuleButtonInPrompt: false,
    onCreateRulesClick: jest.fn(),
  };

  it('shows the rules-specific missing privileges title when unauthorized', () => {
    renderWithI18n(<RulesListPrompts {...defaultProps} showNoAuthPrompt />);
    const prompt = screen.getByTestId('noPermissionPrompt');
    expect(prompt).toHaveTextContent('No permissions to read rules');
    // The generic "rules and alerts" copy should not be used on the rules page.
    expect(prompt).not.toHaveTextContent('No permissions to read rules and alerts');
  });

  it('does not render the no-permission prompt when authorized', () => {
    renderWithI18n(<RulesListPrompts {...defaultProps} showNoAuthPrompt={false} />);
    expect(screen.queryByTestId('noPermissionPrompt')).not.toBeInTheDocument();
  });
});
