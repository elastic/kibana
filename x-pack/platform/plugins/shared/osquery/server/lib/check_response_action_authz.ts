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

/** Captures `{{param}}` so `split` yields alternating literal / placeholder segments. */
const DYNAMIC_PARAMETER_REGEX = /\{{([^}]+)\}}/g;

interface OsqueryCapabilities {
  writeLiveQueries: boolean;
  runSavedQueries: boolean;
}

const capabilitiesCache = new WeakMap<KibanaRequest, Promise<OsqueryCapabilities>>();
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

export const getOsqueryCapabilities = (
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

/** `writeLiveQueries` may supply SQL. `runSavedQueries` may only run a resolved saved query or pack. */
export const isOsqueryResponseActionAuthorized = async (
  coreStart: CoreStart,
  request: KibanaRequest,
  actionParams: CheckResponseActionAuthzParams,
  spaceId?: string
): Promise<boolean> => {
  const { writeLiveQueries, runSavedQueries } = await getOsqueryCapabilities(coreStart, request);

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

  if (!resolved) {
    return false;
  }

  return callerSuppliedQueryMatches(actionParams, resolved);
};

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

const SQL_IN_SUBSTITUTION = /;|--|\/\*|\bunion\b/i;

/** UI still posts client-substituted `{{param}}` SQL; substitutions must not contain SQL. */
const queriesMatch = (supplied: string, stored: string): boolean => {
  if (supplied === stored) {
    return true;
  }

  if (!containsDynamicQuery(stored)) {
    return false;
  }

  const segments = stored.split(DYNAMIC_PARAMETER_REGEX);
  // A placeholder-only stored query would compile to ^[\s\S]*$ and match any SQL.
  const literals = segments.filter((_, index) => index % 2 === 0);
  if (literals.every((literal) => literal.trim() === '')) {
    return false;
  }

  const pattern = segments
    .map((segment, index) => (index % 2 === 1 ? '([\\s\\S]*)' : escapeRegExp(segment)))
    .join('');

  const match = new RegExp(`^${pattern}$`).exec(supplied);

  if (!match) {
    return false;
  }

  return match.slice(1).every((captured) => !SQL_IN_SUBSTITUTION.test(captured));
};

/** Throws 403 if the request is not authorized for the given osquery response action. */
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
