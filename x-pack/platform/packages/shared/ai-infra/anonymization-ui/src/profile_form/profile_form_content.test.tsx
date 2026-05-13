/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID } from '@kbn/anonymization-common';
import { ProfileFormContent } from './profile_form_content';
import { useProfileFormContext } from './profile_form_context';
import { buildProfileFormContextValue } from './test_fixtures/profile_form_context_value';

jest.mock('./profile_form_context', () => ({
  useProfileFormContext: jest.fn(),
}));

const setContext = (overrides = {}) => {
  jest.mocked(useProfileFormContext).mockReturnValue({
    ...buildProfileFormContextValue(),
    ...overrides,
    fieldRulesError: undefined,
    nerRulesError: undefined,
    regexRulesError: undefined,
  });
};

describe('ProfileFormContent', () => {
  it('hides Field rules tab for global anonymization profile', () => {
    setContext({
      targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
    });
    render(<ProfileFormContent />);

    expect(screen.queryByRole('tab', { name: 'Field rules' })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Regex rules' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'NER rules' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Preview' })).not.toBeInTheDocument();
  });

  it('shows Field rules tab for non-global profiles', () => {
    setContext();
    render(<ProfileFormContent />);

    expect(screen.getByRole('tab', { name: 'Field rules' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Preview' })).toBeInTheDocument();
  });
});
