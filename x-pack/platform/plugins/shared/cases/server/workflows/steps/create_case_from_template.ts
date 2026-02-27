/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { createServerStepDefinition } from '@kbn/workflows-extensions/server';
import {
  createCaseFromTemplateStepCommonDefinition,
  type CreateCaseFromTemplateStepConfig,
  type CreateCaseFromTemplateStepInput,
  type CreateCaseFromTemplateStepOutput,
} from '../../../common/workflows/steps/create_case_from_template';
import type { Configurations, TemplateConfiguration } from '../../../common/types/domain';
import type { CasesClient } from '../../client';
import { createCasesStepHandler, normalizeCaseStepUpdatesForBulkPatch } from './utils';
import {
  getInitialCaseValue,
  type GetInitialCaseValueArgs,
} from '../../../common/utils/get_initial_case_value';

// TODO: make dynamic once https://github.com/elastic/security-team/issues/15982 has been resolved
const WORKFLOW_CASE_OWNER = 'securitySolution' as const;

const findTemplateById = (
  configurations: Configurations,
  templateId: string
): TemplateConfiguration | undefined => {
  return configurations
    .flatMap((configuration) => configuration.templates ?? [])
    .find((template) => template.key === templateId);
};

export const createCaseFromTemplateStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>
) =>
  createServerStepDefinition({
    ...createCaseFromTemplateStepCommonDefinition,
    handler: createCasesStepHandler<
      CreateCaseFromTemplateStepInput,
      CreateCaseFromTemplateStepConfig,
      CreateCaseFromTemplateStepOutput['case']
    >(getCasesClient, async (casesClient, input) => {
      const configurations = await casesClient.configure.get({ owner: WORKFLOW_CASE_OWNER });
      const template = findTemplateById(configurations, input.case_template_id);

      if (!template) {
        throw new Error(
          `Case template not found for owner "${WORKFLOW_CASE_OWNER}": ${input.case_template_id}`
        );
      }

      const normalizedOverwrites = input.overwrites
        ? normalizeCaseStepUpdatesForBulkPatch(input.overwrites)
        : {};

      const mergedCreatePayload = getInitialCaseValue({
        owner: WORKFLOW_CASE_OWNER,
        ...(template.caseFields ?? {}),
        ...(normalizedOverwrites as Partial<GetInitialCaseValueArgs>),
      } as GetInitialCaseValueArgs);

      const createdCase = await casesClient.cases.create(mergedCreatePayload);
      return createCaseFromTemplateStepCommonDefinition.outputSchema.shape.case.parse(createdCase);
    }),
  });
