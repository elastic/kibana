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
import {
  createCasesStepHandler,
  normalizeCaseStepUpdatesForBulkPatch,
  safeParseCaseForWorkflowOutput,
} from './utils';
import {
  getInitialCaseValue,
  type GetInitialCaseValueArgs,
} from '../../../common/utils/get_initial_case_value';

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
      const { case_template_id, owner, overwrites } = input;
      const configurations = await casesClient.configure.get({ owner });
      const template = findTemplateById(configurations, case_template_id);

      if (!template) {
        throw new Error(`Case template not found for owner "${owner}": ${case_template_id}`);
      }

      const normalizedOverwrites = overwrites
        ? normalizeCaseStepUpdatesForBulkPatch(overwrites)
        : {};

      const mergedCreatePayload = getInitialCaseValue({
        owner,
        ...(template.caseFields ?? {}),
        ...normalizedOverwrites,
      } as GetInitialCaseValueArgs);

      const createdCase = await casesClient.cases.create(mergedCreatePayload);
      return safeParseCaseForWorkflowOutput(
        createCaseFromTemplateStepCommonDefinition.outputSchema.shape.case,
        createdCase
      );
    }),
  });
