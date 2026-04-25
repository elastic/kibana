/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldRule, NerRule, RegexRule } from '@kbn/anonymization-common';
import type {
  AnonymizationUiServices,
  FetchPreviewDocument,
  TrustedNerModelOption,
} from '../contracts';
import type { ProfilesApiError } from '../common/services/profiles/errors';
import type { InlineDeanonymizationEntry } from '../common/types/replacements';
import type { TargetType } from './types';

export interface ProfileFormProps {
  isEdit: boolean;
  isManageMode: boolean;
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
  conflictProfileId?: string;
  isSubmitting: boolean;
  onOpenConflictProfile?: (profileId: string) => void;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  onTargetTypeChange: (targetType: TargetType) => void;
  onTargetIdChange: (targetId: string) => void;
  onFieldRulesChange: (rules: FieldRule[]) => void;
  onRegexRulesChange: (rules: RegexRule[]) => void;
  onNerRulesChange: (rules: NerRule[]) => void;
  listTrustedNerModels?: () => Promise<TrustedNerModelOption[]>;
  fetchPreviewDocument?: FetchPreviewDocument;
  unavailableTargetIds?: string[];
  replacementsId?: string;
  inlineDeanonymizations?: InlineDeanonymizationEntry[];
  fetch: AnonymizationUiServices['http']['fetch'];
  onCancel: () => void;
  onSubmit: () => Promise<void>;
}
