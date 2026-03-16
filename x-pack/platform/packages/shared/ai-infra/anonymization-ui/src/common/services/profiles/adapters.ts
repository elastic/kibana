/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AnonymizationProfile,
  CreateAnonymizationProfileRequest,
  FindAnonymizationProfilesQuery,
  FindAnonymizationProfilesResponse,
} from '@kbn/anonymization-common';
import { anonymizationProfileSchema as profileSchema } from '@kbn/anonymization-common';
import { z } from '@kbn/zod';
import type { ProfilesListQuery, UpdateProfileInput } from '../../types/profiles';

const findProfilesResponseSchema = z.object({
  data: z.array(profileSchema),
  page: z.number(),
  perPage: z.number(),
  total: z.number(),
});

export const toProfile = (profile: unknown): AnonymizationProfile => {
  const parsed = profileSchema.safeParse(profile);
  if (!parsed.success) {
    throw new Error('Invalid anonymization profile response payload');
  }

  return parsed.data;
};

export const toProfilesListResult = (response: unknown): FindAnonymizationProfilesResponse => {
  const parsed = findProfilesResponseSchema.safeParse(response);
  if (!parsed.success) {
    throw new Error('Invalid profiles list response payload');
  }

  return parsed.data;
};

const SORT_FIELD_MAP: Record<
  NonNullable<ProfilesListQuery['sortField']>,
  NonNullable<FindAnonymizationProfilesQuery['sort_field']>
> = {
  createdAt: 'created_at',
  name: 'name',
  updatedAt: 'updated_at',
};

export const toFindProfilesQuery = (query: ProfilesListQuery): FindAnonymizationProfilesQuery => {
  const normalized: FindAnonymizationProfilesQuery = {};

  if (query.filter) normalized.filter = query.filter;
  if (query.targetType) normalized.target_type = query.targetType;
  if (query.targetId) normalized.target_id = query.targetId;
  if (query.sortField) normalized.sort_field = SORT_FIELD_MAP[query.sortField];
  if (query.sortOrder) normalized.sort_order = query.sortOrder;
  if (query.page) normalized.page = query.page;
  if (query.perPage) normalized.per_page = query.perPage;

  return normalized;
};

const toRulePayload = (
  rules: CreateAnonymizationProfileRequest['rules'] | UpdateProfileInput['rules']
) => {
  if (!rules) {
    return undefined;
  }

  return {
    fieldRules: rules.fieldRules.map((rule) => ({
      field: rule.field,
      allowed: rule.allowed,
      anonymized: rule.anonymized,
      entityClass: rule.entityClass,
    })),
    regexRules: (rules.regexRules ?? []).map((rule) => ({
      id: rule.id,
      type: 'regex',
      entityClass: rule.entityClass,
      pattern: rule.pattern,
      enabled: rule.enabled,
    })),
    nerRules: (rules.nerRules ?? []).map((rule) => ({
      id: rule.id,
      type: 'ner',
      modelId: rule.modelId,
      allowedEntityClasses: rule.allowedEntityClasses,
      enabled: rule.enabled,
    })),
  };
};

export const toCreateProfilePayload = (input: CreateAnonymizationProfileRequest) => ({
  name: input.name,
  description: input.description,
  targetType: input.targetType,
  targetId: input.targetId,
  rules: toRulePayload(input.rules)!,
});

export const toUpdateProfilePayload = (input: UpdateProfileInput) => ({
  name: input.name,
  description: input.description,
  rules: toRulePayload(input.rules),
});
