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
  UpdateActionPolicyData,
} from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import type { ActionPolicySavedObjectAttributes } from '../../saved_objects';

const isoDateTimeString = z.string().datetime();

export function validateDateString(dateString: string): void {
  const result = isoDateTimeString.safeParse(dateString);
  if (!result.success) {
    throw Boom.badRequest(`Invalid date string - "${dateString}" is not a valid ISO datetime`);
  }
}

const normalizeNullableField = <T>(value: T | null | undefined): T | null => value ?? null;

const resolveNextNullableField = <T>(
  value: T | null | undefined,
  existing: T | null | undefined
): T | null => {
  if (value !== undefined) {
    return value;
  }

  return normalizeNullableField(existing);
};

const toAuthResponse = (
  auth: ActionPolicySavedObjectAttributes['auth']
): ActionPolicyResponse['auth'] => {
  return {
    owner: auth.owner,
    createdByUser: auth.createdByUser,
  };
};

export const buildCreateActionPolicyAttributes = ({
  data,
  auth,
  createdBy,
  createdByUsername,
  createdAt,
  updatedBy,
  updatedByUsername,
  updatedAt,
}: {
  data: CreateActionPolicyData;
  auth: ActionPolicySavedObjectAttributes['auth'];
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedAt: string;
}): ActionPolicySavedObjectAttributes => {
  return {
    name: data.name,
    description: data.description,
    enabled: true,
    destinations: data.destinations,
    matcher: data.matcher ?? null,
    groupBy: data.groupBy ?? null,
    tags: data.tags ?? null,
    groupingMode: data.groupingMode ?? null,
    throttle: data.throttle ?? null,
    snoozedUntil: null,
    auth,
    createdBy,
    createdByUsername,
    createdAt,
    updatedBy,
    updatedByUsername,
    updatedAt,
  };
};

export const buildUpdateActionPolicyAttributes = ({
  existing,
  update,
  auth,
  updatedBy,
  updatedByUsername,
  updatedAt,
}: {
  existing: ActionPolicySavedObjectAttributes;
  update: UpdateActionPolicyData;
  auth: ActionPolicySavedObjectAttributes['auth'];
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedAt: string;
}): ActionPolicySavedObjectAttributes => {
  return {
    name: update.name ?? existing.name,
    description: update.description ?? existing.description,
    enabled: existing.enabled,
    destinations: update.destinations ?? existing.destinations,
    matcher: resolveNextNullableField(update.matcher, existing.matcher),
    groupBy: resolveNextNullableField(update.groupBy, existing.groupBy),
    tags: resolveNextNullableField(update.tags, existing.tags),
    groupingMode: resolveNextNullableField(update.groupingMode, existing.groupingMode),
    throttle: resolveNextNullableField(update.throttle, existing.throttle),
    snoozedUntil: normalizeNullableField(existing.snoozedUntil),
    auth,
    createdBy: existing.createdBy,
    createdByUsername: existing.createdByUsername,
    updatedBy,
    updatedByUsername,
    createdAt: existing.createdAt,
    updatedAt,
  };
};

export const transformActionPolicySoAttributesToApiResponse = ({
  id,
  version,
  attributes,
}: {
  id: string;
  version?: string;
  attributes: ActionPolicySavedObjectAttributes;
}): ActionPolicyResponse => {
  return {
    id,
    version,
    name: attributes.name,
    description: attributes.description,
    enabled: attributes.enabled,
    destinations: attributes.destinations,
    matcher: normalizeNullableField(attributes.matcher),
    groupBy: normalizeNullableField(attributes.groupBy),
    tags: normalizeNullableField(attributes.tags),
    groupingMode: normalizeNullableField(attributes.groupingMode),
    throttle: normalizeNullableField(attributes.throttle),
    snoozedUntil: normalizeNullableField(attributes.snoozedUntil),
    auth: toAuthResponse(attributes.auth),
    createdBy: attributes.createdBy,
    createdByUsername: attributes.createdByUsername,
    createdAt: attributes.createdAt,
    updatedBy: attributes.updatedBy,
    updatedByUsername: attributes.updatedByUsername,
    updatedAt: attributes.updatedAt,
  };
};
