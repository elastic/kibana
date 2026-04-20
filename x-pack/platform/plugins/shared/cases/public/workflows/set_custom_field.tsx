/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SelectionOption } from '@kbn/workflows/types/latest';
import { getCaseConfigure } from '../containers/configure/api';
import { setCustomFieldStepCommonDefinition } from '../../common/workflows/steps/set_custom_field';
import type { Owner } from '../../common/bundled-types.gen';
import type { CasesConfigurationUICustomField } from '../../common/ui';
import * as i18n from '../../common/workflows/translations';
import { collectSelectionSearchOptions } from './selection_search';
import { createPublicCaseStepDefinition } from './shared';
import { isValidOwner } from '../../common/utils/owner';

const toSelectionOption = (
  customField: CasesConfigurationUICustomField
): SelectionOption<string> => ({
  value: customField.key,
  label: customField.label,
  description: customField.type,
});

const getCustomFieldsForWorkflowOwner = async (owner: Owner) => {
  const configurations = (await getCaseConfigure({})) ?? [];

  return configurations
    .filter((configuration) => configuration.owner === owner)
    .flatMap((configuration) => configuration.customFields ?? []);
};

export const setCustomFieldStepDefinition = createPublicCaseStepDefinition({
  ...setCustomFieldStepCommonDefinition,
  editorHandlers: {
    input: {
      field_name: {
        selection: {
          dependsOnValues: ['input.owner'],
          search: async (input, ctx) => {
            const owner = ctx.values.input.owner;
            if (!isValidOwner(owner)) {
              return [];
            }

            const query = input.trim().toLowerCase();
            const customFields = await getCustomFieldsForWorkflowOwner(owner);

            const queryIsEmpty = query.length === 0;

            return collectSelectionSearchOptions({
              items: customFields,
              hasEmptyQuery: queryIsEmpty,
              matchesQuery: (customField) => {
                const fieldKey = customField.key.toLowerCase();
                const fieldLabel = customField.label.toLowerCase();
                return fieldKey.includes(query) || fieldLabel.includes(query);
              },
              toOption: (customField) => toSelectionOption(customField),
            });
          },
          resolve: async (value, ctx) => {
            const owner = ctx.values.input.owner;
            if (!isValidOwner(owner)) {
              return null;
            }

            const customFields = await getCustomFieldsForWorkflowOwner(owner);
            const customField = customFields.find((currentField) => currentField.key === value);

            if (!customField) {
              return null;
            }

            return toSelectionOption(customField);
          },
          getDetails: async (value, _context, option) => {
            if (option) {
              return {
                message: i18n.CUSTOM_FIELD_CAN_BE_USED_MESSAGE(option.value),
              };
            }

            return {
              message: i18n.CUSTOM_FIELD_NOT_FOUND_MESSAGE(value),
            };
          },
        },
      },
    },
  },
});
