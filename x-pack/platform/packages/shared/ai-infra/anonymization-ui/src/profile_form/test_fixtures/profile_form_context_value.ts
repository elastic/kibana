/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TARGET_TYPE_INDEX } from '../../common/target_types';
import type { ProfileFormContextValue } from '../profile_form_context';

const createDefaultProfileFormContextValue = (): ProfileFormContextValue => ({
  isEdit: true,
  isManageMode: true,
  name: 'Profile',
  description: '',
  targetType: TARGET_TYPE_INDEX,
  targetId: 'logs-default',
  fieldRules: [],
  regexRules: [],
  nerRules: [],
  isSubmitting: false,
  onNameChange: jest.fn(),
  onDescriptionChange: jest.fn(),
  onTargetTypeChange: jest.fn(),
  onTargetIdChange: jest.fn(),
  onFieldRulesChange: jest.fn(),
  onRegexRulesChange: jest.fn(),
  onNerRulesChange: jest.fn(),
  fetchPreviewDocument: jest.fn(),
  fetch: jest.fn(),
  onCancel: jest.fn(),
  onSubmit: jest.fn().mockResolvedValue(undefined),
  targetIdField: {
    targetIdOptions: [],
    selectedTargetIdOptions: [],
    selectedTargetDisplayName: undefined,
    targetIdHelpText: null,
    targetIdAsyncError: undefined,
    isTargetIdValidating: false,
    isTargetIdLoading: false,
    onTargetIdSearchChange: jest.fn(),
    onTargetIdFocus: jest.fn(),
    onTargetIdSelectChange: jest.fn(),
    onTargetIdCreateOption: undefined,
    validateAndHydrateTargetId: jest.fn().mockResolvedValue(true),
  },
  includeHiddenAndSystemIndices: false,
  onIncludeHiddenAndSystemIndicesChange: jest.fn(),
  submitAttemptCount: 0,
});

export const buildProfileFormContextValue = (
  overrides: Partial<ProfileFormContextValue> = {}
): ProfileFormContextValue => {
  const base = createDefaultProfileFormContextValue();

  return {
    ...base,
    ...overrides,
    targetIdField: {
      ...base.targetIdField,
      ...(overrides.targetIdField ?? {}),
    },
  };
};
