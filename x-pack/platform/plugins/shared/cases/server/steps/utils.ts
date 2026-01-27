/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Utilities for workflow step implementations
 *
 * This module provides helper functions to reduce code duplication across
 * workflow step handlers, particularly for accessing the cases client.
 *
 * ## Usage Pattern
 *
 * When registering workflow steps in the plugin, pass the `getCasesClient` function
 * from the plugin setup phase to each step definition factory:
 *
 * ```typescript
 * // In plugin.ts setup method:
 * const getCasesClient = async (request: KibanaRequest): Promise<CasesClient> => {
 *   const [coreStart] = await core.getStartServices();
 *   return this.getCasesClientWithRequest(coreStart)(request);
 * };
 *
 * // Register workflow steps with workflowsExtensions plugin:
 * if (plugins.workflowsExtensions) {
 *   plugins.workflowsExtensions.registerSteps([
 *     getCaseByIdStepDefinition(core, getCasesClient),
 *     createCaseStepDefinition(core, getCasesClient),
 *     // ... other step definitions
 *   ]);
 * }
 * ```
 *
 * This pattern ensures all steps share the same client access logic while
 * properly handling authorization, licensing, and request context.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import type { CasesClient } from '../client';

export async function getCasesClientFromStepsContext(
  context: StepHandlerContext,
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
): Promise<CasesClient> {
  // Get the fake request from the workflow context
  const request = context.contextManager.getFakeRequest();

  // The getCasesClient function already handles all the necessary setup:
  // - Authorization checks
  // - Licensing validation
  // - Request context initialization
  // - Scoped cluster client creation
  return getCasesClient(request);
}

/**
 * Creates a standardized handler for cases workflow steps.
 *
 * This factory eliminates boilerplate by handling the common pattern:
 * 1. Get cases client from context
 * 2. Execute a cases client operation with the input
 * 3. Return the result wrapped in the expected output format
 * 4. Handle errors consistently
 *
 * @param getCasesClient - Function to get cases client from a request
 * @param operation - Function that performs the actual cases operation
 * @returns A step handler function ready to use in step definitions
 *
 * @example
 * ```typescript
 * // Simple case - direct operation call
 * export const getCaseByIdStepDefinition = (coreSetup, getCasesClient) =>
 *   createServerStepDefinition({
 *     ...getCaseByIdStepCommonDefinition,
 *     handler: createCasesStepHandler(
 *       getCasesClient,
 *       async (client, input) => client.cases.get(input)
 *     ),
 *   });
 *
 * // Complex case - custom operation logic
 * export const updateCaseStepDefinition = (coreSetup, getCasesClient) =>
 *   createServerStepDefinition({
 *     ...updateCaseStepCommonDefinition,
 *     handler: createCasesStepHandler(
 *       getCasesClient,
 *       async (client, input) => {
 *         const { case_id, ...updates } = input;
 *         return client.cases.update({ cases: [{ id: case_id, ...updates }] });
 *       }
 *     ),
 *   });
 * ```
 */
export function createCasesStepHandler<TInput = unknown, TOutput = unknown>(
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  operation: (client: CasesClient, input: TInput) => Promise<TOutput>
) {
  return async (context: StepHandlerContext) => {
    try {
      const casesClient = await getCasesClientFromStepsContext(context, getCasesClient);
      // context.input is validated by the step's inputSchema before reaching the handler,
      // so it's safe to cast to the expected input type
      const result = await operation(casesClient, context.input as TInput);

      return {
        output: {
          case: result,
        },
      };
    } catch (error) {
      return { error };
    }
  };
}
