/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeRegExp } from 'lodash';
import deepEqual from 'fast-deep-equal';
import type { CoreSetup, CoreStart, KibanaRequest } from '@kbn/core/server';
import type { CheckResponseActionAuthzParams } from '../types';
import { CustomHttpRequestError } from '../common/error';
import { containsDynamicQuery } from '../../common/utils/replace_params_query';
import type { ResolvedQueryReference } from './resolve_query_reference';
import { resolveQueryReference, toEcsMappingRecord } from './resolve_query_reference';

/**
 * Matches `{{ dynamic.parameter }}` placeholders, capturing the parameter name so
 * `String.prototype.split` yields alternating literal / placeholder segments.
 * Mirrors CONTAINS_DYNAMIC_PARAMETER_REGEX in common/utils/replace_params_query.ts.
 */
const DYNAMIC_PARAMETER_REGEX = /\{{([^}]+)\}}/g;

interface OsqueryCapabilities {
  writeLiveQueries: boolean;
  runSavedQueries: boolean;
}

// Cache capability resolution per request so bulk operations (e.g., duplicating
// hundreds of rules) only call resolveCapabilities once per request.
const capabilitiesCache = new WeakMap<KibanaRequest, Promise<OsqueryCapabilities>>();

// Cache reference resolution per request so the same saved_query_id / pack_id is
// not fetched twice when a bulk rule action repeats it.
const referenceCache = new WeakMap<
  KibanaRequest,
  Map<string, Promise<ResolvedQueryReference | undefined>>
>();

const resolveCachedQueryReference = (
  request: KibanaRequest,
  coreStart: CoreStart,
  spaceId: string | undefined,
  reference: { saved_query_id?: string; pack_id?: string }
): Promise<ResolvedQueryReference | undefined> => {
  const cacheKey = `${spaceId ?? ''}::${reference.saved_query_id ?? ''}::${
    reference.pack_id ?? ''
  }`;
  let perRequest = referenceCache.get(request);

  if (!perRequest) {
    perRequest = new Map();
    referenceCache.set(request, perRequest);
  }

  const cached = perRequest.get(cacheKey);

  if (cached) {
    return cached;
  }

  const pending = resolveQueryReference(coreStart, spaceId, reference);
  perRequest.set(cacheKey, pending);

  return pending;
};

const resolveOsqueryCapabilities = (
  coreStart: CoreStart,
  request: KibanaRequest
): Promise<OsqueryCapabilities> => {
  let promise = capabilitiesCache.get(request);

  if (!promise) {
    promise = (async () => {
      const resolved = await coreStart.capabilities.resolveCapabilities(request, {
        capabilityPath: 'osquery.*',
      });

      return {
        writeLiveQueries: !!resolved.osquery.writeLiveQueries,
        runSavedQueries: !!resolved.osquery.runSavedQueries,
      };
    })();
    capabilitiesCache.set(request, promise);
  }

  return promise;
};

/**
 * Checks whether the requesting user has the required osquery privileges
 * for a given action configuration.
 *
 * Privilege logic:
 * - `writeLiveQueries` → may supply arbitrary osquery SQL.
 * - `runSavedQueries` only → may run a saved query or pack, but may NOT supply SQL.
 *   The `saved_query_id` / `pack_id` reference is resolved to a real saved object and
 *   the stored query is what gets dispatched. A `queries[]` array is always rejected.
 *   A supplied `query` or `ecs_mapping` that does not match the stored content is
 *   rejected rather than silently ignored, so the boundary is observable to API clients.
 *
 * The presence of a non-empty id is deliberately NOT sufficient: treating the id as a
 * capability assertion rather than a reference to resolve is what allowed a
 * `runSavedQueries`-only caller to dispatch arbitrary SQL.
 *
 * @returns true if authorized, false otherwise
 */
export const isOsqueryResponseActionAuthorized = async (
  coreStart: CoreStart,
  request: KibanaRequest,
  actionParams: CheckResponseActionAuthzParams,
  spaceId?: string
): Promise<boolean> => {
  const { writeLiveQueries, runSavedQueries } = await resolveOsqueryCapabilities(
    coreStart,
    request
  );

  if (writeLiveQueries) {
    return true;
  }

  if (!runSavedQueries) {
    return false;
  }

  const resolved = await resolveCachedQueryReference(request, coreStart, spaceId, {
    saved_query_id: actionParams.saved_query_id,
    pack_id: actionParams.pack_id,
  });

  // Unresolvable (missing, blank, or in another space) reference: not authorized.
  if (!resolved) {
    return false;
  }

  return callerSuppliedQueryMatches(actionParams, resolved);
};

/**
 * A `runSavedQueries`-only caller may not introduce SQL of their own.
 *
 * `queries[]` takes precedence over `saved_query_id` when the action is built, so any
 * array is rejected regardless of whether its SQL happens to match the stored object.
 * A supplied `query` / `ecs_mapping` must match the resolved reference; otherwise the
 * request is rejected rather than silently rewritten.
 */
const callerSuppliedQueryMatches = (
  actionParams: CheckResponseActionAuthzParams,
  resolved: ResolvedQueryReference
): boolean => {
  if (actionParams.queries?.length) {
    return false;
  }

  if (actionParams.query !== undefined) {
    const storedQueries = resolved.queries ?? (resolved.query ? [resolved.query] : []);

    if (!storedQueries.some((stored) => queriesMatch(actionParams.query as string, stored))) {
      return false;
    }
  }

  if (actionParams.ecs_mapping !== undefined) {
    const suppliedMapping = toEcsMappingRecord(actionParams.ecs_mapping);
    const storedMapping = toEcsMappingRecord(resolved.ecs_mapping);

    if (!deepEqual(suppliedMapping, storedMapping)) {
      return false;
    }
  }

  return true;
};

/**
 * Compares a caller-supplied query against a stored one.
 *
 * A stored query may carry `{{dynamic.parameters}}` that the UI substitutes client-side
 * before submitting, so an exact match is not always possible. When the stored query is
 * parameterised we compare structurally: the literal segments around each placeholder
 * must match, and each placeholder may stand in for any single substituted value.
 */
const queriesMatch = (supplied: string, stored: string): boolean => {
  if (supplied === stored) {
    return true;
  }

  if (!containsDynamicQuery(stored)) {
    return false;
  }

  const pattern = stored
    .split(DYNAMIC_PARAMETER_REGEX)
    .map((segment, index) =>
      // Odd indices are the captured parameter names; even indices are literal text.
      index % 2 === 1 ? '[\\s\\S]*' : escapeRegExp(segment)
    )
    .join('');

  return new RegExp(`^${pattern}$`).test(supplied);
};

/**
 * Validates that the requesting user has the required osquery privileges
 * for the given response action configuration.
 * Throws a 403 CustomHttpRequestError if the user lacks authorization.
 *
 * Used by security_solution when creating/updating detection rules
 * that include osquery response actions.
 */
export const checkResponseActionAuthz = async (
  core: CoreSetup,
  request: KibanaRequest,
  actionParams: CheckResponseActionAuthzParams,
  spaceId?: string
): Promise<void> => {
  const [coreStart] = await core.getStartServices();
  const isAuthorized = await isOsqueryResponseActionAuthorized(
    coreStart,
    request,
    actionParams,
    spaceId
  );

  if (!isAuthorized) {
    throw new CustomHttpRequestError(
      'User is not authorized to create/update osquery response action',
      403
    );
  }
};
