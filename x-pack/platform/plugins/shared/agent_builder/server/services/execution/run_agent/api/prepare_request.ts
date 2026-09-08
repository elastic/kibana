/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import type { ApiTarget } from '@kbn/agent-builder-common';
import { getUnusableQueryParams } from './query_params';
import { loadApi } from './load_api';
import type { LoadApiFailure } from './load_api';
import { getValidator } from './validate_params';
import type { ParamsValidationError, ParamsValidator } from './validate_params';
import type { ApiRegistryDefinition, ApiRequest } from './types';

/**
 * Explains why an API cannot be called at all, for the cases we refuse up front rather
 * than letting the request fail against the server.
 *
 * @param definition - The API's registry definition.
 * @returns The reason the API is unsupported, or `undefined` when it can be called.
 */
export const getUnsupportedReason = (definition: ApiRegistryDefinition): string | undefined =>
  definition.bodyFormat === 'ndjson'
    ? 'This API takes a newline-delimited (NDJSON) request body. The generated schemas do not model ' +
      'that payload as a parameter, so there is no way to supply one.'
    : undefined;

export type PrepareApiRequestFailure =
  | LoadApiFailure
  | { status: 'unsupported_api'; reason: string }
  | { status: 'schema_unavailable'; error: unknown }
  | { status: 'invalid_params'; errors: ParamsValidationError[] }
  | { status: 'unresolved_path_params'; params: string[]; pathTemplate: string }
  | { status: 'unusable_query_params'; params: string[] }
  | { status: 'cross_space'; requestedSpaceId: string; currentSpaceId: string };

export type PrepareApiRequestResult =
  | { status: 'prepared'; request: ApiRequest; destructive: boolean }
  | PrepareApiRequestFailure;

export interface PrepareApiRequestParams {
  target: ApiTarget;
  api: string;
  params: Record<string, unknown>;
  spaceId: string;
}

/**
 * Turns an API identifier and a flat params map into a concrete HTTP request.
 *
 * Validates the params against the API's schema, routes them into the path, query string, and
 * body, and refuses everything that cannot be called: unsupported payload formats, unresolved
 * path parameters, query values a query string cannot carry, and cross-space Kibana paths.
 *
 * @param params - The target, API identifier, caller-supplied params, and current space.
 * @returns The request to dispatch along with whether the API is destructive, or the reason no
 * request could be built.
 */
export const prepareApiRequest = async ({
  target,
  api,
  params,
  spaceId,
}: PrepareApiRequestParams): Promise<PrepareApiRequestResult> => {
  const loadResult = await loadApi(target, api);
  if (loadResult.status !== 'loaded') {
    return loadResult;
  }

  const { definition, buildRequest } = loadResult.loaded;

  const unsupportedReason = getUnsupportedReason(definition);
  if (unsupportedReason) {
    return { status: 'unsupported_api', reason: unsupportedReason };
  }

  if (definition.input) {
    let validate: ParamsValidator;
    try {
      validate = await getValidator(target, definition.input);
    } catch (error) {
      return { status: 'schema_unavailable', error };
    }

    const validationErrors = validate(params);
    if (validationErrors.length > 0) {
      return { status: 'invalid_params', errors: validationErrors };
    }
  }

  const request = buildRequest(params);

  const unresolvedPathParams = Array.from(request.path.matchAll(/\{([^}]+)\}/g)).map(
    ([, paramName]) => paramName
  );
  if (unresolvedPathParams.length > 0) {
    return {
      status: 'unresolved_path_params',
      params: unresolvedPathParams,
      pathTemplate: definition.path,
    };
  }

  const unusableQueryParams = getUnusableQueryParams(request.querystring);
  if (unusableQueryParams.length > 0) {
    return { status: 'unusable_query_params', params: unusableQueryParams };
  }

  if (target !== 'kibana') {
    return { status: 'prepared', request, destructive: definition.destructive };
  }

  // Workaround: some Kibana specs hardcode a `/s/{spaceId}` prefix in their path keys
  // (e.g. SLO APIs). Remove once those specs drop it from their path keys.
  const {
    spaceId: requestedSpaceId,
    hasExplicitSpaceIdentifier,
    pathname,
  } = getSpaceIdFromPath(request.path);

  if (hasExplicitSpaceIdentifier && requestedSpaceId !== spaceId) {
    return { status: 'cross_space', requestedSpaceId, currentSpaceId: spaceId };
  }

  return {
    status: 'prepared',
    request: { ...request, path: pathname },
    destructive: definition.destructive,
  };
};
