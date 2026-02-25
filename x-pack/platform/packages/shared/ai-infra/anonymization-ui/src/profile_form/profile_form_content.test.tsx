/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TARGET_TYPE_INDEX } from '../common/target_types';
import { GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID } from '@kbn/anonymization-common';
import { ProfileFormContent } from './profile_form_content';
import { useProfileFormContext } from './profile_form_context';

jest.mock('./profile_form_context', () => ({
  useProfileFormContext: jest.fn(),
}));

const setContext = (overrides = {}) => {
  jest.mocked(useProfileFormContext).mockReturnValue({
    fieldRules: [],
    fieldRulesError: undefined,
    isEdit: true,
    isManageMode: true,
    isSubmitting: false,
    nerRulesError: undefined,
    onFieldRulesChange: jest.fn(),
    regexRulesError: undefined,
    targetType: TARGET_TYPE_INDEX,
    targetId: 'logs-default',
    targetIdField: {
      selectedTargetDisplayName: undefined,
    },
    ...overrides,
  } as any);
};

describe('ProfileFormContent', () => {
  it('hides Field rules tab for global anonymization profile', () => {
    setContext({
      targetId: GLOBAL_ANONYMIZATION_PROFILE_TARGET_ID,
    });
    render(<ProfileFormContent />);

    expect(screen.queryByText('Field rules')).not.toBeInTheDocument();
    expect(screen.getByText('Regex rules')).toBeInTheDocument();
    expect(screen.getByText('NER rules')).toBeInTheDocument();
  });

  it('shows Field rules tab for non-global profiles', () => {
    setContext();
    render(<ProfileFormContent />);

    expect(screen.getByText('Field rules')).toBeInTheDocument();
  });
});
