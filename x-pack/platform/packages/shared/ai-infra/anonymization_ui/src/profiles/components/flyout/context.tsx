/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { createContext, useContext } from 'react';
import type { FieldRule, NerRule, RegexRule } from '@kbn/anonymization-common';
import type { FetchPreviewDocument, TrustedNerModelOption } from '../../../contracts';
import type { ProfilesApiError } from '../../services/profiles/errors';
import type { TargetType } from '../../types';
import type { UseTargetIdFieldResult } from './hooks/use_target_id_field';

export interface ProfileFlyoutContextValue {
  isEdit: boolean;
  isManageMode: boolean;
  isSubmitting: boolean;
  name: string;
  description: string;
  targetType: TargetType;
  targetId: string;
  fieldRules: FieldRule[];
  regexRules: RegexRule[];
  nerRules: NerRule[];
  nameError?: string;
  targetIdError?: string;
  fieldRulesError?: string;
  regexRulesError?: string;
  nerRulesError?: string;
  submitError?: ProfilesApiError;
  hasConflict?: boolean;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTargetTypeChange: (targetType: TargetType) => void;
  onTargetIdChange: (targetId: string) => void;
  onFieldRulesChange: (rules: FieldRule[]) => void;
  onRegexRulesChange: (rules: RegexRule[]) => void;
  onNerRulesChange: (rules: NerRule[]) => void;
  listTrustedNerModels?: () => Promise<TrustedNerModelOption[]>;
  fetchPreviewDocument?: FetchPreviewDocument;
  onCancel: () => void;
  onSubmit: () => Promise<void>;
  targetIdField: UseTargetIdFieldResult;
}

const ProfileFlyoutContext = createContext<ProfileFlyoutContextValue | undefined>(undefined);

export const ProfileFlyoutContextProvider = ({
  value,
  children,
}: {
  value: ProfileFlyoutContextValue;
  children: React.ReactNode;
}) => <ProfileFlyoutContext.Provider value={value}>{children}</ProfileFlyoutContext.Provider>;

export const useProfileFlyoutContext = (): ProfileFlyoutContextValue => {
  const context = useContext(ProfileFlyoutContext);
  if (context === undefined) {
    throw new Error('useProfileFlyoutContext must be used within ProfileFlyoutContextProvider');
  }
  return context;
};
