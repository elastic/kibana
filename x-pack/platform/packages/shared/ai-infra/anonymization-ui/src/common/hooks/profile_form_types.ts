/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnonymizationProfile,
  FieldRule,
  RegexRule,
  NerRule,
} from '@kbn/anonymization-common';
import type { TargetType } from '../types/profiles';

export interface ProfileFormValues {
  name: string;
  description: string;
  targetType: TargetType;
  targetId: string;
  fieldRules: FieldRule[];
  regexRules: RegexRule[];
  nerRules: NerRule[];
}

export interface ProfileFormValidationErrors {
  name?: string;
  targetType?: string;
  targetId?: string;
  fieldRules?: string;
  regexRules?: string;
  nerRules?: string;
}

export interface ProfileFormSubmitResult {
  profile?: AnonymizationProfile;
  isConflict?: boolean;
}
