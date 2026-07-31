/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { CoreSetup } from '@kbn/core-lifecycle-server';
import { i18n } from '@kbn/i18n';
import { AgentExecutionMode, platformCoreTools, ToolType } from '@kbn/agent-builder-common';
import type { BuiltinToolDefinition } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';
import { ConfirmationStatus } from '@kbn/agent-builder-common/agents/prompts';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { HttpSelfFetchQuery } from '@kbn/core-http-server';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { capitalize } from 'lodash';
import type { AgentBuilderPlatformPluginStart, PluginStartDependencies } from '../../types';
import {
  getRegistries,
  getUnsupportedReason,
  getUnusableQueryParams,
  getValidator,
  isQueryScalar,
  isRecord,
  isUnknownApiError,
  targetSchema,
} from './shared';
import type { ApiTarget } from './shared';

export interface ApiExecuteResultData {
  target: ApiTarget;
  api: string;
  method: string;
  path: string;
  response: unknown;
}

const executeSchema = z.object({
  target: targetSchema,
  api: z
    .string()
    .describe(
      `The API identifier returned by the ${platformCoreTools.discover} tool, formed from the namespace ` +
        'and name (e.g. "indices.create", "bulk", "cluster.health").'
    ),
  params: z
    .record(z.string(), z.unknown())
    .optional()
    .describe(
      `Flat map of parameter values. Keys must match the field names from the ${platformCoreTools.describe} ` +
        'schema. Supply every parameter here regardless of where it belongs in the request: the ' +
        'routing into the URL path, query string, and request body is handled automatically.'
    ),
});

interface FailureDetails {
  statusCode?: number;
  body?: unknown;
}

const getFailureDetails = (error: unknown): FailureDetails => {
  if (typeof error !== 'object' || error === null) {
    return {};
  }

  const details: FailureDetails = {};
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    details.statusCode = error.statusCode;
  } else if (
    'response' in error &&
    typeof error.response === 'object' &&
    error.response !== null &&
    'status' in error.response &&
    typeof error.response.status === 'number'
  ) {
    details.statusCode = error.response.status;
  }
  if ('body' in error && error.body !== undefined) {
    details.body = error.body;
  }
  return details;
};

const toSelfFetchQuery = (
  querystring: Record<string, unknown> | undefined
): HttpSelfFetchQuery | undefined => {
  if (querystring == null) return undefined;
  return Object.entries(querystring).reduce<HttpSelfFetchQuery>((query, [key, value]) => {
    if (Array.isArray(value)) {
      query[key] = value.map((item) => String(item));
    } else if (isQueryScalar(value)) {
      query[key] = value;
    }
    return query;
  }, {});
};

export const apiExecuteTool = (
  coreSetup: CoreSetup<PluginStartDependencies, AgentBuilderPlatformPluginStart>
): BuiltinToolDefinition<typeof executeSchema> => {
  return {
    id: platformCoreTools.execute,
    type: ToolType.builtin,
    description: `Execute an HTTP API call on behalf of the current user.

- Use \`${platformCoreTools.discover}\` to find the \`api\` identifier, then
  \`${platformCoreTools.describe}\` to see the \`params\` it accepts.
- Responses are not summarized, and many of these APIs return very large payloads. Prefer params
  that narrow the response (a filter, a \`size\`/\`per_page\` limit, a \`page\`/\`from\` offset, or an
  explicit field selection) over fetching everything, because an oversized result is truncated
  before you see it.

The response is the raw API response body.`,
    schema: executeSchema,
    experimental: true,
    handler: async (
      { target, api, params = {} },
      { esClient, request, spaceId, logger, prompts, callContext, executionMode }
    ) => {
      let registries;
      try {
        registries = await getRegistries();
      } catch (err) {
        logger.error(`${platformCoreTools.execute}: failed to load the API registry: ${err}`);
        return {
          results: [
            createErrorResult({
              message: `Failed to load the API registry: ${
                err instanceof Error ? err.message : String(err)
              }`,
            }),
          ],
        };
      }

      const registry = registries[target];

      let loaded;
      try {
        loaded = await registry.loadApi(api);
      } catch (err) {
        if (isUnknownApiError(err)) {
          return {
            results: [
              createErrorResult({
                message: `Unknown API identifier: "${api}". Use the ${platformCoreTools.discover} tool to find valid identifiers.`,
              }),
            ],
          };
        }
        logger.error(
          `${platformCoreTools.execute}: failed to load API "${api}" (target=${target}): ${err}`
        );
        return {
          results: [
            createErrorResult({
              message: `Failed to load API definition for "${api}": ${
                err instanceof Error ? err.message : String(err)
              }`,
            }),
          ],
        };
      }

      const unsupportedReason = getUnsupportedReason(loaded.definition);
      if (unsupportedReason) {
        return {
          results: [
            createErrorResult({
              message: `Cannot execute "${api}": ${unsupportedReason} Do not retry it.`,
              metadata: { target, api },
            }),
          ],
        };
      }

      if (loaded.definition.input) {
        let validate;
        try {
          validate = await getValidator(target, loaded.definition.input);
        } catch (err) {
          logger.error(
            `${platformCoreTools.execute}: failed to build the params validator for "${api}" (target=${target}): ${err}`
          );
          return {
            results: [
              createErrorResult({
                message:
                  `Cannot execute "${api}": its parameter schema could not be loaded, so the params ` +
                  `cannot be validated. Do not retry it.`,
                metadata: { target, api },
              }),
            ],
          };
        }

        const validationErrors = validate(params);
        if (validationErrors.length > 0) {
          const summary = validationErrors
            .map(({ path, message }) => `${path === '#' ? '(root)' : path}: ${message}`)
            .join('; ');
          return {
            results: [
              createErrorResult({
                message:
                  `Invalid params for "${api}": ${summary}. ` +
                  `Call ${platformCoreTools.describe} to see the accepted params.`,
                metadata: { target, api },
              }),
            ],
          };
        }
      }

      const apiRequest = loaded.buildRequest(params);

      // Handle path parameters that were not supplied to `buildRequest`
      const unresolvedPathParams = Array.from(apiRequest.path.matchAll(/\{([^}]+)\}/g)).map(
        ([, paramName]) => paramName
      );
      if (unresolvedPathParams.length > 0) {
        return {
          results: [
            createErrorResult({
              message:
                `Cannot execute "${api}": no value was supplied for the path ` +
                `parameter(s) ${unresolvedPathParams.map((name) => `"${name}"`).join(', ')}. ` +
                `Call ${platformCoreTools.describe} to see the accepted params, then retry with ` +
                `every parameter the path template interpolates.`,
              metadata: { target, api, path: loaded.definition.path },
            }),
          ],
        };
      }

      // Handle query parameters that cannot be serialized into a query string
      const unusableQueryParams = getUnusableQueryParams(apiRequest.querystring);
      if (unusableQueryParams.length > 0) {
        return {
          results: [
            createErrorResult({
              message:
                `Cannot execute "${api}": the query parameter(s) ` +
                `${unusableQueryParams
                  .map((name) => `"${name}"`)
                  .join(', ')} were given values a ` +
                `query string cannot carry. Query parameters only accept strings, numbers, ` +
                `booleans, or arrays of those. Call ${platformCoreTools.describe} to check the ` +
                `expected type, then retry with a scalar value.`,
              metadata: { target, api, params: unusableQueryParams },
            }),
          ],
        };
      }

      // Workaround: some Kibana specs hardcode a `/s/{spaceId}` prefix in their path keys
      // (e.g. SLO APIs). Remove once those specs drop it from their path keys.
      let requestPath = apiRequest.path;
      if (target === 'kibana') {
        const {
          spaceId: requestedSpaceId,
          hasExplicitSpaceIdentifier,
          pathname,
        } = getSpaceIdFromPath(apiRequest.path);

        if (hasExplicitSpaceIdentifier && requestedSpaceId !== spaceId) {
          return {
            results: [
              createErrorResult({
                message:
                  `Cannot execute "${api}" against space "${requestedSpaceId}": this tool only calls ` +
                  `APIs in the current space, "${spaceId}". Retry with the spaceId param set to ` +
                  `"${spaceId}", or tell the user to switch spaces.`,
                metadata: { target, api, requestedSpaceId, currentSpaceId: spaceId },
              }),
            ],
          };
        }

        requestPath = pathname;
      }

      if (loaded.definition.destructive) {
        if (executionMode === AgentExecutionMode.standalone) {
          return {
            results: [
              createErrorResult({
                message:
                  `API "${api}" is destructive and needs the user to confirm it, which is not possible ` +
                  `in a non-interactive execution. Use a non-destructive API, or tell the user to run this from a conversation.`,
                metadata: { target, api, method: apiRequest.method, path: requestPath },
              }),
            ],
          };
        }

        const promptId = `${platformCoreTools.execute}.${callContext.toolCallId}`;
        const { status } = prompts.checkConfirmationStatus(promptId);

        if (status === ConfirmationStatus.rejected) {
          return {
            results: [
              createErrorResult({
                message: `The user declined the destructive call to "${api}". Do not retry it.`,
                metadata: { target, api, method: apiRequest.method, path: requestPath },
              }),
            ],
          };
        }

        if (status === ConfirmationStatus.unprompted) {
          return prompts.askForConfirmation({
            id: promptId,
            title: i18n.translate(
              'xpack.agentBuilderPlatform.tools.apiExecute.confirmation.title',
              {
                defaultMessage: 'Allow `{toolName}` to run?',
                values: { toolName: platformCoreTools.execute },
              }
            ),
            message: i18n.translate(
              'xpack.agentBuilderPlatform.tools.apiExecute.confirmation.message',
              {
                defaultMessage:
                  'The agent wants to call `{method} {path}` on {target}. This operation can modify or delete existing data.',
                values: {
                  method: apiRequest.method,
                  path: requestPath,
                  target: capitalize(target),
                },
              }
            ),
            confirm_text: i18n.translate(
              'xpack.agentBuilderPlatform.tools.apiExecute.confirmation.confirmText',
              { defaultMessage: 'Approve' }
            ),
            cancel_text: i18n.translate(
              'xpack.agentBuilderPlatform.tools.apiExecute.confirmation.cancelText',
              { defaultMessage: 'Deny' }
            ),
          });
        }
      }

      logger.debug(
        `${platformCoreTools.execute}: ${apiRequest.method} ${requestPath} (target=${target}, api=${api})`
      );

      try {
        let response: unknown;

        if (target === 'kibana') {
          const [coreStart] = await coreSetup.getStartServices();

          response = await coreStart.http.selfClient.asScoped(request).fetch(requestPath, {
            method: apiRequest.method,
            query: toSelfFetchQuery(apiRequest.querystring),
            body: apiRequest.body,
            access: requestPath.startsWith('/internal') ? 'internal' : 'public',
          });
        } else {
          const transportParams: Parameters<typeof esClient.asCurrentUser.transport.request>[0] = {
            method: apiRequest.method,
            path: requestPath,
          };

          if (apiRequest.querystring != null) {
            transportParams.querystring = apiRequest.querystring;
          }
          if (isRecord(apiRequest.body)) {
            transportParams.body = apiRequest.body;
          }

          response = await esClient.asCurrentUser.transport.request(transportParams);
        }

        const data: ApiExecuteResultData = {
          target,
          api,
          method: apiRequest.method,
          path: requestPath,
          response,
        };

        return {
          results: [
            {
              type: ToolResultType.other,
              data,
            },
          ],
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        logger.warn(
          `${platformCoreTools.execute}: request failed for "${api}" (target=${target}): ${message}`
        );
        return {
          results: [
            createErrorResult({
              message: `API request failed: ${message}`,
              metadata: {
                target,
                api,
                method: apiRequest.method,
                path: requestPath,
                ...getFailureDetails(err),
              },
            }),
          ],
        };
      }
    },
    tags: [],
  };
};
