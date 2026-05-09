/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getCaseConfigure } from '../containers/configure/api';
import { createCaseFromTemplateStepCommonDefinition } from '../../common/workflows/steps/create_case_from_template';
import * as i18n from '../../common/workflows/translations';
import { collectSelectionSearchOptions } from './selection_search';
import { createPublicCaseStepDefinition } from './shared';
import { isValidOwner } from '../../common/utils/owner';
import type { Owner } from '../../common/bundled-types.gen';

const getTemplatesForWorkflowOwner = async (owner: Owner) => {
  const configurations = (await getCaseConfigure({})) ?? [];
  return configurations
    .filter((configuration) => configuration.owner === owner)
    .flatMap((configuration) => configuration.templates ?? []);
};

export const createCreateCaseFromTemplateStepDefinition = createPublicCaseStepDefinition({
  ...createCaseFromTemplateStepCommonDefinition,
  editorHandlers: {
    input: {
      case_template_id: {
        selection: {
          dependsOnValues: ['input.owner'],
          search: async (input, ctx) => {
            const owner = ctx.values.input.owner;
            if (!isValidOwner(owner)) {
              return [];
            }

            const query = input.trim().toLowerCase();
            const templates = await getTemplatesForWorkflowOwner(owner);

            const queryIsEmpty = query.length === 0;

            return collectSelectionSearchOptions({
              items: templates,
              hasEmptyQuery: queryIsEmpty,
              matchesQuery: (template) =>
                template.key.toLowerCase().includes(query) ||
                template.name.toLowerCase().includes(query),
              toOption: (template) => ({
                value: template.key,
                label: template.name,
                description: template.description,
              }),
            });
          },
          resolve: async (value, ctx) => {
            const owner = ctx.values.input.owner;
            if (!owner) {
              return null;
            }
            const templates = await getTemplatesForWorkflowOwner(owner);
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
