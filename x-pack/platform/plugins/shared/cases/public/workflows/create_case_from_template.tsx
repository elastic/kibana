/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import type { SelectionOption } from '@kbn/workflows/types/latest';
import { getCaseConfigure } from '../containers/configure/api';
import {
  createCaseFromTemplateStepCommonDefinition,
  CreateCaseFromTemplateStepTypeId,
} from '../../common/workflows/steps/create_case_from_template';
import * as i18n from './translations';

const WORKFLOW_CASE_OWNER = 'securitySolution';

const getTemplatesForWorkflowOwner = async () => {
  const configurations = (await getCaseConfigure({})) ?? [];
  return configurations
    .filter((configuration) => configuration.owner === WORKFLOW_CASE_OWNER)
    .flatMap((configuration) => configuration.templates ?? []);
};

export const createCreateCaseFromTemplateStepDefinition = () =>
  createPublicStepDefinition({
    ...createCaseFromTemplateStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.CREATE_CASE_FROM_TEMPLATE_STEP_LABEL,
    description: i18n.CREATE_CASE_FROM_TEMPLATE_STEP_DESCRIPTION,
    documentation: {
      details: i18n.CREATE_CASE_FROM_TEMPLATE_STEP_DOCUMENTATION_DETAILS,
      examples: [
        `## Create case from template
\`\`\`yaml
- name: create_case_from_template
  type: ${CreateCaseFromTemplateStepTypeId}
  with:
    case_template_id: "triage_template"
\`\`\``,
        `## Create case from template with overwrites
\`\`\`yaml
- name: create_case_from_template_with_overwrites
  type: ${CreateCaseFromTemplateStepTypeId}
  with:
    case_template_id: "triage_template"
    overwrites:
      title: "Template based case title"
      severity: "high"
      status: "in-progress"
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
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
