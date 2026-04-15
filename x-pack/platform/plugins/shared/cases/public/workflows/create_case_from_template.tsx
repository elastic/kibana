/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows/types/latest';
import { getCaseConfigure } from '../containers/configure/api';
import { createCaseFromTemplateStepCommonDefinition } from '../../common/workflows/steps/create_case_from_template';
import * as i18n from '../../common/workflows/translations';
import { createPublicCaseStepDefinition } from './shared';

const WORKFLOW_CASE_OWNER = 'securitySolution';

const getTemplatesForWorkflowOwner = async () => {
  const configurations = (await getCaseConfigure({})) ?? [];
  return configurations
    .filter((configuration) => configuration.owner === WORKFLOW_CASE_OWNER)
    .flatMap((configuration) => configuration.templates ?? []);
};

export const createCreateCaseFromTemplateStepDefinition = () =>
  createPublicCaseStepDefinition({
    ...createCaseFromTemplateStepCommonDefinition,
    editorHandlers: {
      input: {
        case_template_id: {
          selection: {
            search: async (input) => {
              const templates = await getTemplatesForWorkflowOwner();
              const query = input.trim().toLowerCase();

              if (query.length === 0) {
                return [];
              }

              return templates.reduce<SelectionOption<string>[]>((acc, template) => {
                if (
                  template.key.toLowerCase().includes(query) ||
                  template.name.toLowerCase().includes(query)
                ) {
                  acc.push({
                    value: template.key,
                    label: template.name,
                    description: template.description,
                  });
                }
                return acc;
              }, []);
            },
            resolve: async (value) => {
              const templates = await getTemplatesForWorkflowOwner();
              const template = templates.find((currentTemplate) => currentTemplate.key === value);
              if (!template) {
                return null;
              }

              return {
                value: template.key,
                label: template.name,
                description: template.description,
              };
            },
            getDetails: async (value, _context, option) => {
              if (option) {
                return {
                  message: i18n.TEMPLATE_CAN_BE_USED_MESSAGE(option.value),
                };
              }

              return {
                message: i18n.TEMPLATE_NOT_FOUND_MESSAGE(value),
              };
            },
          },
        },
      },
    },
  });
