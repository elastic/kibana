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
import { BODY_ROOT_KEY, isRecord } from './types';
import type { ApiRegistryDefinition, ApiRequest } from './types';

const getBodyRootParam = (definition: ApiRegistryDefinition): string | undefined => {
  const properties = definition.input?.properties;
  if (!isRecord(properties)) {
    return undefined;
  }
  return Object.keys(properties).find((name) => {
    const spec = properties[name];
    return isRecord(spec) && spec[BODY_ROOT_KEY] === true;
  });
};

const unwrapBodyRoot = (definition: ApiRegistryDefinition, request: ApiRequest): ApiRequest => {
  const bodyRootParam = getBodyRootParam(definition);
  if (bodyRootParam === undefined) {
    return request;
  }

  const { body, bulkBody } = request;
  if (isRecord(bulkBody) && bodyRootParam in bulkBody) {
    return { ...request, bulkBody: bulkBody[bodyRootParam] };
  }
  if (isRecord(body) && bodyRootParam in body) {
    return { ...request, body: body[bodyRootParam] };
  }
  return request;
};

export type PrepareApiRequestFailure =
  | LoadApiFailure
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
 * Validates a flat params map against its API's schema and transforms it into an HTTP request.
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

  const request = unwrapBodyRoot(definition, buildRequest(params));

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
