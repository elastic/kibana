/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RegexRulesPanel } from './regex_rules_panel';
import { useProfileFormContext } from '../../profile_form_context';
import { buildProfileFormContextValue } from '../../test_fixtures/profile_form_context_value';

jest.mock('../../profile_form_context', () => ({
  useProfileFormContext: jest.fn(),
}));

const setContext = (overrides = {}) => {
  const onRegexRulesChange = jest.fn();
  jest.mocked(useProfileFormContext).mockReturnValue({
    ...buildProfileFormContextValue({
      regexRules: [
        {
          id: 'regex-1',
          type: 'regex',
          entityClass: 'MISC',
          pattern: '/geoip\\..*/',
          enabled: true,
        },
      ],
    }),
    onRegexRulesChange,
    ...overrides,
  });

  return { onRegexRulesChange };
};

describe('RegexRulesPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows regex example placeholder', () => {
    setContext();
    render(<RegexRulesPanel />);

    expect(
      screen.getAllByPlaceholderText(
        'Regex pattern (for example: /\\b\\d{1,3}(?:\\.\\d{1,3}){3}\\b/)'
      )
    ).toHaveLength(2);
  });

  it('toggles rule state through enabled/disabled button group', () => {
    const { onRegexRulesChange } = setContext();
    render(<RegexRulesPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Disabled' }));
    expect(onRegexRulesChange).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'regex-1', enabled: false }),
    ]);
  });

  it('removes a regex rule with trash action', () => {
    const { onRegexRulesChange } = setContext();
    const { container } = render(<RegexRulesPanel />);

    const removeButton = container.querySelector(
      '[data-test-subj="anonymizationProfilesRegexRuleRemove"]'
    );
    expect(removeButton).toBeTruthy();
    fireEvent.click(removeButton as Element);
    expect(onRegexRulesChange).toHaveBeenCalledWith([]);
  });

  it('shows info callout when there are no regex rules', () => {
    setContext({ regexRules: [] });
    render(<RegexRulesPanel />);

    expect(screen.getByText('No regex rules configured')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Use regex rules to match patterns in field values (for example email addresses or IP addresses) and map those matches to an entity-class mask.'
      )
    ).toBeInTheDocument();
  });

  it('requires both pattern and entity class to enable add button', () => {
    setContext();
    render(<RegexRulesPanel />);

    fireEvent.change(screen.getByLabelText('New entity class'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Add regex' })).toBeDisabled();
  });

  it('shows row-level invalid state when regex validation error is present', () => {
    setContext({
      regexRules: [
        {
          id: 'regex-1',
          type: 'regex',
          entityClass: 'MISC',
          pattern: '',
          enabled: true,
        },
      ],
      regexRulesError: 'Regex pattern and entity class are required for regex rules',
    });
    render(<RegexRulesPanel />);

    expect(
      screen.getByText('Regex pattern and entity class are required for regex rules')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Regex pattern for rule regex-1')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });
});
