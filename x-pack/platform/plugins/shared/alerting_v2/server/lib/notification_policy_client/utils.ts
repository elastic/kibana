/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type {
  CreateNotificationPolicyData,
  NotificationPolicyResponse,
  UpdateNotificationPolicyData,
} from '@kbn/alerting-v2-schemas';
import { z } from '@kbn/zod/v4';
import type { NotificationPolicySavedObjectAttributes } from '../../saved_objects';

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
  auth: NotificationPolicySavedObjectAttributes['auth']
): NotificationPolicyResponse['auth'] => {
  return {
    owner: auth.owner,
    createdByUser: auth.createdByUser,
  };
};

export const buildCreateNotificationPolicyAttributes = ({
  data,
  auth,
  createdBy,
  createdByUsername,
  createdAt,
  updatedBy,
  updatedByUsername,
  updatedAt,
}: {
  data: CreateNotificationPolicyData;
  auth: NotificationPolicySavedObjectAttributes['auth'];
  createdBy: string | null;
  createdByUsername: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedAt: string;
}): NotificationPolicySavedObjectAttributes => {
  return {
    name: data.name,
    description: data.description,
    enabled: true,
    destinations: data.destinations,
    matcher: data.matcher ?? null,
    groupBy: data.groupBy ?? null,
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

export const buildUpdateNotificationPolicyAttributes = ({
  existing,
  update,
  auth,
  updatedBy,
  updatedByUsername,
  updatedAt,
}: {
  existing: NotificationPolicySavedObjectAttributes;
  update: UpdateNotificationPolicyData;
  auth: NotificationPolicySavedObjectAttributes['auth'];
  updatedBy: string | null;
  updatedByUsername: string | null;
  updatedAt: string;
}): NotificationPolicySavedObjectAttributes => {
  return {
    name: update.name ?? existing.name,
    description: update.description ?? existing.description,
    enabled: existing.enabled,
    destinations: update.destinations ?? existing.destinations,
    matcher: resolveNextNullableField(update.matcher, existing.matcher),
    groupBy: resolveNextNullableField(update.groupBy, existing.groupBy),
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

export const transformNotificationPolicySoAttributesToApiResponse = ({
  id,
  version,
  attributes,
}: {
  id: string;
  version?: string;
  attributes: NotificationPolicySavedObjectAttributes;
}): NotificationPolicyResponse => {
  return {
    id,
    version,
    name: attributes.name,
    description: attributes.description,
    enabled: attributes.enabled,
    destinations: attributes.destinations,
    matcher: normalizeNullableField(attributes.matcher),
    groupBy: normalizeNullableField(attributes.groupBy),
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
