/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UpdateAnonymizationProfileRequest,
  FieldRule,
  NerRule,
  RegexRule,
} from '@kbn/anonymization-common';
import type { TargetType as SharedTargetType } from '../target_types';

export type TargetType = SharedTargetType;

export interface ProfilesListQuery {
  filter?: string;
  targetType?: TargetType;
  targetId?: string;
  sortField?: 'createdAt' | 'name' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

export interface UpdateProfileInput {
  id: string;
  name?: UpdateAnonymizationProfileRequest['name'];
  description?: UpdateAnonymizationProfileRequest['description'];
  rules?: {
    fieldRules: FieldRule[];
    regexRules?: RegexRule[];
    nerRules?: NerRule[];
  };
}

export interface ProfilesQueryContext {
  spaceId: string;
}
