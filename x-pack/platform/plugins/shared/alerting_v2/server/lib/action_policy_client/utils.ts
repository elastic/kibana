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
import { normalizeMatcher } from '@kbn/alerting-v2-utils';
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

/**
 * Projects a stored throttle onto the strategy variant it names. Documents written before the
 * throttle became a discriminated union may hold keys their strategy never used, or no strategy at
 * all; neither names a variant, so a stray interval is dropped and a block that cannot form a
 * variant reads the same as no throttle.
 */
const toApiThrottle = (
  throttle: { strategy?: ThrottleStrategy; interval?: string | null } | null | undefined
): ActionPolicyResponse['throttle'] => {
  const strategy = throttle?.strategy;
  if (strategy == null) return undefined;
  if (!needsInterval(strategy)) return { strategy };

  return throttle?.interval ? { strategy, interval: throttle.interval } : undefined;
};

const toApiGroupBy = (
  groupBy: ActionPolicySavedObjectAttributes['groupBy']
): ActionPolicyResponse['group_by'] => (groupBy?.length ? groupBy : undefined);

const toApiDescription = (
  description: ActionPolicySavedObjectAttributes['description']
): ActionPolicyResponse['description'] => description || undefined;

export const toApiKeyAttributes = (auth: ApiKeyAttributes) => ({
  apiKey: auth.apiKey,
  apiKeyOwner: auth.owner,
  apiKeyCreatedByUser: auth.createdByUser,
});

/**
 * The create-shaped view of a stored policy, so a PATCH merges against exactly the document a GET
 * would return rather than against the `null` sentinels older documents may still hold.
 */
export const toPatchableActionPolicyData = (
  attributes: ActionPolicySavedObjectAttributes
): CreateActionPolicyDataInput => ({
  name: attributes.name,
  description: toApiDescription(attributes.description),
  destinations: attributes.destinations,
  matcher: normalizeMatcher(attributes.matcher),
  group_by: toApiGroupBy(attributes.groupBy),
  grouping_mode: attributes.groupingMode ?? undefined,
  throttle: toApiThrottle(attributes.throttle),
});

/**
 * The client-owned fields of a policy, in storage form. Shared so create and update cannot drift.
 *
 * A cleared field is written as `undefined`, which the full-document write drops from the document
 * entirely. The storage schema still accepts `null` so that documents written before this
 * convention keep validating, but nothing writes one.
 */
const toStoredPolicyFields = (data: CreateActionPolicyData) => ({
  name: data.name,
  description: data.description,
  destinations: data.destinations,
  matcher: normalizeMatcher(data.matcher),
  groupBy: data.group_by,
  groupingMode: data.grouping_mode,
  throttle: data.throttle,
});

export const buildCreateActionPolicyAttributes = ({
  data,
  auth,
  createdBy,
  createdAt,
  updatedBy,
  updatedAt,
}: {
  data: CreateActionPolicyData;
  auth: ApiKeyAttributes;
  createdBy: ActionPolicySavedObjectAttributes['createdBy'];
  createdAt: string;
  updatedBy: ActionPolicySavedObjectAttributes['updatedBy'];
  updatedAt: string;
}): ActionPolicySavedObjectAttributes => {
  return {
    ...toStoredPolicyFields(data),
    enabled: true,
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
    tags: existing.tags ?? undefined,
    snoozedUntil: existing.snoozedUntil ?? undefined,
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
    description: toApiDescription(attributes.description),
    enabled: attributes.enabled,
    destinations: attributes.destinations,
    matcher: normalizeMatcher(attributes.matcher),
    group_by: toApiGroupBy(attributes.groupBy),
    grouping_mode: attributes.groupingMode ?? undefined,
    throttle: toApiThrottle(attributes.throttle),
    snoozed_until: attributes.snoozedUntil ?? undefined,
    created_by: attributes.createdBy,
    created_at: attributes.createdAt,
    updated_by: attributes.updatedBy,
    updated_at: attributes.updatedAt,
  };
};
