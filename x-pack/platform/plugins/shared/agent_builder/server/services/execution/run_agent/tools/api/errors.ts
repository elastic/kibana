/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { ErrorResult } from '@kbn/agent-builder-common/tools/tool_result';
import { createErrorResult } from '@kbn/agent-builder-server';
import type { ApiTarget } from '@kbn/agent-builder-common';
import type { PrepareApiRequestFailure } from '../../api';

export interface ApiFailureContext {
  toolId: string;
  target: ApiTarget;
  api: string;
  logger: Logger;
}

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const quoteAll = (names: string[]): string => names.map((name) => `"${name}"`).join(', ');

/**
 * Renders the failure to reach the API registry at all, which every API tool can hit.
 *
 * @param error - The value `getRegistries` rejected with.
 * @param context - The reporting tool and its logger.
 * @returns An error result naming the underlying failure.
 */
export const registryUnavailableErrorResult = (
  error: unknown,
  { toolId, logger }: Pick<ApiFailureContext, 'toolId' | 'logger'>
): ErrorResult => {
  logger.error(`${toolId}: failed to load the API registry: ${error}`);
  return createErrorResult({ message: `Failed to load the API registry: ${toMessage(error)}` });
};

/**
 * Renders a failure from `loadApi` or `prepareApiRequest` into the error result the model sees.
 *
 * @param failure - The failed outcome to render.
 * @param context - The reporting tool, the API it was called for, and its logger.
 * @returns An error result carrying the message, and the call metadata when it is known.
 */
export const apiFailureToErrorResult = (
  failure: PrepareApiRequestFailure,
  { toolId, target, api, logger }: ApiFailureContext
): ErrorResult => {
  const metadata = { target, api };

  switch (failure.status) {
    case 'registry_unavailable':
      return registryUnavailableErrorResult(failure.error, { toolId, logger });

    case 'unknown_api':
      return createErrorResult({
        message:
          `Unknown API identifier: "${api}". Use the ${internalTools.discoverApis} tool to ` +
          `find valid identifiers.`,
      });

    case 'load_failed':
      logger.error(`${toolId}: failed to load API "${api}" (target=${target}): ${failure.error}`);
      return createErrorResult({
        message: `Failed to load API definition for "${api}": ${toMessage(failure.error)}`,
      });

    case 'schema_unavailable':
      logger.error(
        `${toolId}: failed to build the params validator for "${api}" (target=${target}): ${failure.error}`
      );
      return createErrorResult({
        message:
          `Cannot execute "${api}": its parameter schema could not be loaded, so the params ` +
          `cannot be validated. Do not retry it.`,
        metadata,
      });

    case 'invalid_params': {
      const summary = failure.errors
        .map(({ path, message }) => `${path === '#' ? '(root)' : path}: ${message}`)
        .join('; ');
      return createErrorResult({
        message:
          `Invalid params for "${api}": ${summary}. ` +
          `Call ${internalTools.describeApi} to see the accepted params.`,
        metadata,
      });
    }

    case 'unresolved_path_params':
      return createErrorResult({
        message:
          `Cannot execute "${api}": no value was supplied for the path ` +
          `parameter(s) ${quoteAll(failure.params)}. ` +
          `Call ${internalTools.describeApi} to see the accepted params, then retry with ` +
          `every parameter the path template interpolates.`,
        metadata: { ...metadata, path: failure.pathTemplate },
      });

    case 'unusable_query_params':
      return createErrorResult({
        message:
          `Cannot execute "${api}": the query parameter(s) ${quoteAll(failure.params)} were ` +
          `given values a query string cannot carry. Query parameters only accept strings, ` +
          `numbers, booleans, or arrays of those. Call ${internalTools.describeApi} to check ` +
          `the expected type, then retry with a scalar value.`,
        metadata: { ...metadata, params: failure.params },
      });

    case 'cross_space':
      return createErrorResult({
        message:
          `Cannot execute "${api}" against space "${failure.requestedSpaceId}": this tool only ` +
          `calls APIs in the current space, "${failure.currentSpaceId}". Retry with the spaceId ` +
          `param set to "${failure.currentSpaceId}", or tell the user to switch spaces.`,
        metadata: {
          ...metadata,
          requestedSpaceId: failure.requestedSpaceId,
          currentSpaceId: failure.currentSpaceId,
        },
      });
  }
};
