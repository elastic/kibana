/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  ActionPolicyResponse,
  CreateActionPolicyData,
  CreateActionPolicyDataInput,
  ThrottleStrategy,
} from '@kbn/alerting-v2-schemas';
import { needsInterval } from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import type { ActionPolicySavedObjectAttributes } from '../../saved_objects';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import type { ApiKeyAttributes } from '../services/api_key_service/api_key_service';

const isoDateTimeString = z.string().datetime();

export function validateDateString(dateString: string): void {
  const result = isoDateTimeString.safeParse(dateString);
  if (!result.success) {
    throw Boom.badRequest(`Invalid date string - "${dateString}" is not a valid ISO datetime`, {
      code: ALERTING_ERROR_CODES.INVALID_DATE_STRING,
      details: { value: dateString },
    });
  }
}

const normalizeThrottle = (
  throttle: { strategy?: ThrottleStrategy; interval?: string | null } | null | undefined
): { strategy?: ThrottleStrategy; interval: string | null } | null => {
  if (throttle == null) return null;
  const { strategy, interval } = throttle;
  const keepInterval = strategy == null || needsInterval(strategy);
  return {
    strategy,
    interval: keepInterval ? interval ?? null : null,
  };
};

const toApiThrottle = (
  throttle: ActionPolicySavedObjectAttributes['throttle']
): ActionPolicyResponse['throttle'] => {
  const normalized = normalizeThrottle(throttle);
  if (normalized == null) return undefined;
  return { strategy: normalized.strategy, interval: normalized.interval ?? undefined };
};

/** Policies stored before the API rejected empty sentinels can hold `tags: []` or `expression: ''`, both meaning "no constraint". */
const toApiMatcher = (
  matcher: ActionPolicySavedObjectAttributes['matcher']
): ActionPolicyResponse['matcher'] => {
  if (matcher == null) return undefined;

  const tags = matcher.tags?.length ? matcher.tags : undefined;
  const expression = matcher.expression || undefined;

  if (tags === undefined && expression === undefined) return undefined;

  return { tags, expression };
};

export const toApiKeyAttributes = (auth: ApiKeyAttributes) => ({
  apiKey: auth.apiKey,
  apiKeyOwner: auth.owner,
  apiKeyCreatedByUser: auth.createdByUser,
});

/**
 * The create-shaped view of a stored policy, so a PATCH merges against exactly the document a GET
 * would return rather than against the saved object's `null` sentinels.
 */
export const toPatchableActionPolicyData = (
  attributes: ActionPolicySavedObjectAttributes
): CreateActionPolicyDataInput => ({
  name: attributes.name,
  description: attributes.description,
  destinations: attributes.destinations,
  matcher: toApiMatcher(attributes.matcher),
  group_by: attributes.groupBy ?? undefined,
  grouping_mode: attributes.groupingMode ?? undefined,
  throttle: toApiThrottle(attributes.throttle),
});

/** The client-owned fields of a policy, in storage form. Shared so create and update cannot drift. */
const toStoredPolicyFields = (data: CreateActionPolicyData) => ({
  name: data.name,
  description: data.description,
  destinations: data.destinations,
  matcher: data.matcher ?? null,
  groupBy: data.group_by ?? null,
  groupingMode: data.grouping_mode ?? null,
  throttle: normalizeThrottle(data.throttle),
});

export const buildCreateActionPolicyAttributes = ({
  data,
  enabled,
  auth,
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: {
  data: CreateActionPolicyData;
  enabled: boolean;
  auth: ApiKeyAttributes;
  createdBy: ActionPolicySavedObjectAttributes['createdBy'];
  createdAt: string;
  updatedBy: ActionPolicySavedObjectAttributes['updatedBy'];
  updatedAt: string;
}): ActionPolicySavedObjectAttributes => {
  return {
    ...toStoredPolicyFields(data),
    enabled,
    tags: null,
    snoozedUntil: null,
    ...toApiKeyAttributes(auth),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
  };
};

/**
 * Builds the complete next document from the already-merged and validated policy data. Server-owned
 * fields (`enabled`, `tags`, `snoozedUntil`, audit) are never patchable, so they come from storage.
 */
export const buildUpdateActionPolicyAttributes = ({
  existing,
  data,
  auth,
  updatedBy,
  updatedAt,
}: {
  existing: ActionPolicySavedObjectAttributes;
  data: CreateActionPolicyData;
  auth: ApiKeyAttributes;
  updatedBy: ActionPolicySavedObjectAttributes['updatedBy'];
  updatedAt: string;
}): ActionPolicySavedObjectAttributes => {
  return {
    ...toStoredPolicyFields(data),
    enabled: existing.enabled,
    tags: existing.tags ?? null,
    snoozedUntil: existing.snoozedUntil ?? null,
    ...toApiKeyAttributes(auth),
    createdBy: existing.createdBy,
    createdAt: existing.createdAt,
    updatedBy,
    updatedAt,
  };
};

export const transformActionPolicySoAttributesToApiResponse = ({
  id,
  attributes,
}: {
  id: string;
  attributes: ActionPolicySavedObjectAttributes;
}): ActionPolicyResponse => {
  return {
    id,
    name: attributes.name,
    description: attributes.description,
    enabled: attributes.enabled,
    destinations: attributes.destinations,
    matcher: toApiMatcher(attributes.matcher),
    group_by: attributes.groupBy ?? undefined,
    grouping_mode: attributes.groupingMode ?? undefined,
    throttle: toApiThrottle(attributes.throttle),
    snoozed_until: attributes.snoozedUntil ?? undefined,
    created_by: attributes.createdBy,
    created_at: attributes.createdAt,
    updated_by: attributes.updatedBy,
    updated_at: attributes.updatedAt,
  };
};
