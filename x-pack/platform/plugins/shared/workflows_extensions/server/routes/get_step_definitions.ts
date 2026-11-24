/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import type { ServerStepRegistry } from '../step_registry';
import { buildStepContract, type StepContract } from '../step_registry/step_contract';
import type { ServerStepDefinition } from '../step_registry/types';

const ROUTE_PATH = '/internal/workflows_extensions/step_definitions';

interface StepDefinitionEntry {
  id: string;
  contract?: StepContract;
  contractError?: string;
}

// A step whose contract can't be serialized is returned with the error, so the contract
// check reports that step instead of the whole request failing.
const toEntryWithContract = (
  definition: ServerStepDefinition,
  logger: Logger
): StepDefinitionEntry => {
  try {
    return { id: definition.id, contract: buildStepContract(definition) };
  } catch (error) {
    logger.error(`Failed to serialize the contract of step ${definition.id}`, { error });
    return {
      id: definition.id,
      contractError: error instanceof Error ? error.message : `${error}`,
    };
  }
};

/**
 * Registers the route that lists the registered step definitions. The client registration
 * Scout test reads the ids, and the workflow step schema job reads the contracts
 * (`include_contracts=true`) to keep the committed step contracts up to date.
 */
export function registerGetStepDefinitionsRoute(
  router: IRouter,
  registry: ServerStepRegistry,
  logger: Logger
): void {
  router.get(
    {
      path: ROUTE_PATH,
      options: {
        access: 'internal',
      },
      security: {
        authz: {
          enabled: false,
          reason: 'This route is used for testing purposes only. No sensitive data is exposed.',
        },
      },
      validate: {
        query: schema.object({
          include_contracts: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    async (_context, request, response) => {
      const { include_contracts: includeContracts } = request.query;
      // Async loaders (e.g. dynamic imports waiting on start services) may still be pending.
      await registry.whenReady();
      const steps = registry
        .getAll()
        .map((definition) =>
          includeContracts ? toEntryWithContract(definition, logger) : { id: definition.id }
        )
        .sort((a, b) => a.id.localeCompare(b.id));

      return response.ok({ body: { steps } });
    }
  );
}
