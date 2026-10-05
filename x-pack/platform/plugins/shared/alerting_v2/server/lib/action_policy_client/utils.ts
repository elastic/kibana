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
  ThrottleStrategy,
  UpdateActionPolicyData,
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

/** A PATCH that omits a field keeps the stored value; the saved object encodes unset as `null`. */
const resolveNextNullableField = <T>(
  value: T | null | undefined,
  existing: T | null | undefined
): T | null => (value !== undefined ? value : existing ?? null);

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

/** Policies written before the API dropped `null` can still hold `tags: null` / `expression: null`. */
const toApiMatcher = (
  matcher: ActionPolicySavedObjectAttributes['matcher']
): ActionPolicyResponse['matcher'] => {
  if (matcher == null) return undefined;
  return { tags: matcher.tags ?? undefined, expression: matcher.expression ?? undefined };
};

export const toApiKeyAttributes = (auth: ApiKeyAttributes) => ({
  apiKey: auth.apiKey,
  apiKeyOwner: auth.owner,
  apiKeyCreatedByUser: auth.createdByUser,
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
    name: data.name,
    description: data.description,
    enabled,
    destinations: data.destinations,
    matcher: data.matcher ?? null,
    groupBy: data.group_by ?? null,
    tags: null,
    groupingMode: data.grouping_mode ?? null,
    throttle: normalizeThrottle(data.throttle),
    snoozedUntil: null,
    ...toApiKeyAttributes(auth),
    createdBy,
    createdAt,
    updatedBy,
    updatedAt,
  };
};

export const buildUpdateActionPolicyAttributes = ({
  existing,
  update,
  auth,
  updatedBy,
  updatedAt,
}: {
  existing: ActionPolicySavedObjectAttributes;
  update: UpdateActionPolicyData;
  auth: ApiKeyAttributes;
  updatedBy: ActionPolicySavedObjectAttributes['updatedBy'];
  updatedAt: string;
}): ActionPolicySavedObjectAttributes => {
  return {
    name: update.name ?? existing.name,
    description: update.description ?? existing.description,
    enabled: existing.enabled,
    destinations: update.destinations ?? existing.destinations,
    matcher: resolveNextNullableField(update.matcher, existing.matcher),
    groupBy: resolveNextNullableField(update.group_by, existing.groupBy),
    // Tags are excluded from the PATCH schema; always carry the stored value through.
    // If tags is re-added to updateActionPolicyDataSchema, switch to resolveNextNullableField.
    tags: existing.tags ?? null,
    groupingMode: resolveNextNullableField(update.grouping_mode, existing.groupingMode),
    throttle: normalizeThrottle(resolveNextNullableField(update.throttle, existing.throttle)),
    snoozedUntil: existing.snoozedUntil ?? null,
    ...toApiKeyAttributes(auth),
    createdBy: existing.createdBy,
    updatedBy,
    createdAt: existing.createdAt,
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
