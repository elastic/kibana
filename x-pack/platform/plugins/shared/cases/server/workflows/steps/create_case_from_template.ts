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
import { getNoneConnector } from '../../../common/utils/connectors';
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
      // real template SO. The step seeds only the wire-required fields from the template's
      // create-form defaults — everything else (severity / category / assignees / tags / connector /
      // extended_fields) is left to `cases.create`'s server-side expansion (caller-wins).
      if (isTemplatesEnabled) {
        // Unlike `cases.create`'s own (unsecured) template expansion, this step reads the template
        // via the authorized `casesClient.templates` sub-client, so it additionally requires the
        // `getTemplate` privilege for the template's owner.
        const templateSO = await casesClient.templates.getTemplate(case_template_id);

        if (templateSO) {
          // A template resolved for a different owner than the requested case must not be used to
          // seed this create — fail with clear owner context now rather than falling through to
          // `cases.create`'s generic "Template not found" error, which doesn't mention the owner
          // mismatch and leaves the caller guessing whether the template id itself was wrong.
          if (templateSO.attributes.owner !== owner) {
            throw new Error(`Case template "${case_template_id}" not found for owner "${owner}"`);
          }

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

          // `title` and `description` are both wire-required (non-empty). Unlike the other case
          // defaults, expansion never fills either in, so a template missing a default `name` /
          // `description` needs the matching caller-supplied overwrite.
          if (!seededDefaults.title && !normalizedOverwrites.title) {
            throw new Error(
              `Case template "${case_template_id}" has no default title; provide "overwrites.title"`
            );
          }
          if (!seededDefaults.description && !normalizedOverwrites.description) {
            throw new Error(
              `Case template "${case_template_id}" has no default description; provide "overwrites.description"`
            );
          }

          // Build a MINIMAL create payload: only the wire-required fields (title / description /
          // tags / connector / settings / owner) plus the pinned template reference. We must NOT
          // materialize severity / assignees / category / settings.extractObservables here, because
          // `cases.create`'s expansion only applies a template default when the field is
          // `=== undefined`. Seeding those (as getInitialCaseValue does) would silently suppress the
          // template's own severity / assignees / extractObservables / category defaults.
          const createPayload = {
            owner,
            title: '',
            description: '',
            // An empty tags array reads as "caller sent none", so expansion applies the template's
            // tags. A `.none` connector leaves the template connector default free to apply.
            tags: [],
            connector: getNoneConnector(),
            // Unlike the other defaults, expansion always treats `syncAlerts` as caller-supplied
            // (see `applyTemplateDefaultsToCreateRequest`), so it must be seeded from the template
            // here or a `syncAlerts: false` template default would be silently dropped.
            settings: { syncAlerts: parsed.definition.settings?.syncAlerts ?? true },
            ...seededDefaults,
            // Caller overwrites win over the template's seeded title / description and the
            // wire-required scaffolding above.
            ...normalizedOverwrites,
            // The step's `case_template_id` is authoritative — pin it last so an overwrites-supplied
            // template reference can never override the requested template.
            template: {
              id: templateSO.attributes.templateId,
              version: templateSO.attributes.templateVersion,
            },
          } as CasePostRequest;

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
