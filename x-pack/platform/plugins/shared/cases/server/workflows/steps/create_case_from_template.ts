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
import type { CasePostRequest } from '../../../common/types/api';
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
import { parseTemplate } from '../../routes/api/templates/parse_template';

const findTemplateById = (
  configurations: Configurations,
  templateId: string
): TemplateConfiguration | undefined => {
  return configurations
    .flatMap((configuration) => configuration.templates ?? [])
    .find((template) => template.key === templateId);
};

export const createCaseFromTemplateStepDefinition = (
  getCasesClient: (request: KibanaRequest) => Promise<CasesClient>,
  isTemplatesEnabled: boolean
) =>
  createServerStepDefinition({
    ...createCaseFromTemplateStepCommonDefinition,
    handler: createCasesStepHandler<
      CreateCaseFromTemplateStepInput,
      CreateCaseFromTemplateStepConfig,
      CreateCaseFromTemplateStepOutput['case']
    >(getCasesClient, async (casesClient, input) => {
      const { case_template_id, owner, overwrites } = input;
      const normalizedOverwrites = overwrites
        ? normalizeCaseStepUpdatesForBulkPatch(overwrites)
        : {};

      // v2 path (`cases-template` saved objects). When the templates feature is enabled, prefer a
      // real template SO. The step seeds only the wire-required `title` / `description` from the
      // template's create-form defaults (its `name` and `description`) — everything else is left to
      // `cases.create`'s server-side expansion, which fills severity / category / assignees / tags /
      // connector / extended_fields (caller-wins) and pins the resolved template version. The step
      // no longer builds any of those client-side.
      if (isTemplatesEnabled) {
        const templateSO = await casesClient.templates.getTemplate(case_template_id);

        if (templateSO) {
          // `cases.create` re-fetches and re-parses the template for expansion; parsing here as well
          // is a small duplicate read on a cold create path, kept for the wire-required seed values
          // that expansion deliberately does not apply.
          const parsed = parseTemplate(templateSO.attributes);
          const seededDefaults: Partial<CasePostRequest> = {};
          if (parsed.definition.name) {
            seededDefaults.title = parsed.definition.name;
          }
          if (parsed.definition.description) {
            seededDefaults.description = parsed.definition.description;
          }

          const createPayload = getInitialCaseValue({
            owner,
            ...seededDefaults,
            // Caller overwrites win over the template's seeded title / description.
            ...normalizedOverwrites,
            // The step's `case_template_id` is authoritative — pin it last so an overwrites-supplied
            // template reference can never override the requested template.
            template: {
              id: templateSO.attributes.templateId,
              version: templateSO.attributes.templateVersion,
            },
          } as GetInitialCaseValueArgs);

          const createdCase = await casesClient.cases.create(createPayload);
          return safeParseCaseForWorkflowOutput(
            createCaseFromTemplateStepCommonDefinition.outputSchema.shape.case,
            createdCase
          );
        }
      }

      // Legacy path: the templates feature is disabled, or the id is not a v2 template SO — fall
      // back to the per-space configuration templates (`cases-configure`). No server-side expansion
      // applies here; the configuration template's `caseFields` are merged directly, as before.
      const configurations = await casesClient.configure.get({ owner });
      const template = findTemplateById(configurations, case_template_id);

      if (!template) {
        throw new Error(`Case template not found for owner "${owner}": ${case_template_id}`);
      }

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
