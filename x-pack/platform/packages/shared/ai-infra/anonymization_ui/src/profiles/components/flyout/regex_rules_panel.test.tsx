/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { RegexRulesPanel } from './regex_rules_panel';
import { useProfileFlyoutContext } from './context';

jest.mock('./context', () => ({
  useProfileFlyoutContext: jest.fn(),
}));

const setContext = (overrides: Partial<ReturnType<typeof useProfileFlyoutContext>> = {}) => {
  const onRegexRulesChange = jest.fn();
  jest.mocked(useProfileFlyoutContext).mockReturnValue({
    regexRules: [
      {
        id: 'regex-1',
        type: 'regex',
        entityClass: 'CUSTOM',
        pattern: '/geoip\\..*/',
        enabled: true,
      },
    ],
    onRegexRulesChange,
    isManageMode: true,
    isSubmitting: false,
    ...overrides,
  } as unknown as ReturnType<typeof useProfileFlyoutContext>);

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
      screen.getAllByPlaceholderText('Regex pattern (for example: /geoip\\..*/)')
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
        'Use regex rules to match patterns (for example specific path or token formats) and map those matches to an entity-class mask.'
      )
    ).toBeInTheDocument();
  });

  it('requires both pattern and entity class to enable add button', () => {
    setContext();
    render(<RegexRulesPanel />);

    fireEvent.change(screen.getByLabelText('New mask entity class'), { target: { value: '' } });
    expect(screen.getByRole('button', { name: 'Add regex' })).toBeDisabled();
  });

  it('shows row-level invalid state when regex validation error is present', () => {
    setContext({
      regexRules: [
        {
          id: 'regex-1',
          type: 'regex',
          entityClass: '',
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
    expect(screen.getByLabelText('Mask entity class for regex rule regex-1')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
  });
});
