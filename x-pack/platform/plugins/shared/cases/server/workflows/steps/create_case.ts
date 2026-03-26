/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  createCaseStepCommonDefinition,
  type CreateCaseStepConfig,
  type CreateCaseStepInput,
  type CreateCaseStepOutput,
} from '../../../common/workflows/steps/create_case';
import type { CasesClient } from '../../client';

import { createCasesStepHandler } from './utils';
import {
  getInitialCaseValue,
  type GetInitialCaseValueArgs,
} from '../../../common/utils/get_initial_case_value';
import type { ConnectorTypes } from '../../../common/types/domain';

export const createCaseStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...createCaseStepCommonDefinition,
    handler: createCasesStepHandler<
      CreateCaseStepInput,
      CreateCaseStepConfig,
      CreateCaseStepOutput['case']
    >(getCasesClient, async (casesClient, input, config) => {
      let enrichedInput = getInitialCaseValue(input as GetInitialCaseValueArgs);

      // If a connector was provided, make sure to resolve its config and add it to the input.
      if (config['connector-id']) {
        const connectorConfig = await casesClient.configure.getConnectors();
        const foundConnector = connectorConfig.find(
          (connector) => connector.id === config['connector-id']
        );

        if (foundConnector) {
          enrichedInput = {
            ...enrichedInput,
            connector: {
              id: foundConnector.id,
              name: foundConnector.name,
              type: foundConnector.actionTypeId as ConnectorTypes,
              fields: null,
            },
          };
        } else {
          throw new Error(`Connector configuration not found: ${config['connector-id']}`);
        }
      }

      const createdCase = await casesClient.cases.create(enrichedInput);
      return createCaseStepCommonDefinition.outputSchema.shape.case.parse(createdCase);
    }),
  });
