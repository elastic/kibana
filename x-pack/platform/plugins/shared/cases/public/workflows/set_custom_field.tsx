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
  setCustomFieldStepCommonDefinition,
  SetCustomFieldStepTypeId,
} from '../../common/workflows/steps/set_custom_field';
import type { CasesConfigurationUICustomField } from '../../common/ui';
import * as i18n from './translations';

const WORKFLOW_CASE_OWNER = 'securitySolution';

const toSelectionOption = (
  customField: CasesConfigurationUICustomField
): SelectionOption<string> => ({
  value: customField.key,
  label: customField.label,
  description: customField.type,
});

const getCustomFieldsForWorkflowOwner = async () => {
  const configurations = (await getCaseConfigure({})) ?? [];

  return configurations
    .filter((configuration) => configuration.owner === WORKFLOW_CASE_OWNER)
    .flatMap((configuration) => configuration.customFields ?? []);
};

export const createSetCustomFieldStepDefinition = () => {
  return createPublicStepDefinition({
    ...setCustomFieldStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.SET_CUSTOM_FIELD_STEP_LABEL,
    description: i18n.SET_CUSTOM_FIELD_STEP_DESCRIPTION,
    documentation: {
      details: i18n.SET_CUSTOM_FIELD_STEP_DOCUMENTATION_DETAILS,
      examples: [
        `## Set text custom field
\`\`\`yaml
- name: set_text_custom_field
  type: ${SetCustomFieldStepTypeId}
  with:
    case_id: "abc-123-def-456"
    field_name: "priority_reason"
    value: "investigate immediately"
\`\`\``,
        `## Set toggle custom field
\`\`\`yaml
- name: set_toggle_custom_field
  type: ${SetCustomFieldStepTypeId}
  with:
    case_id: "abc-123-def-456"
    field_name: "is_automated"
    value: true
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
    editorHandlers: {
      input: {
        field_name: {
          selection: {
            search: async (input) => {
              const customFields = await getCustomFieldsForWorkflowOwner();
              const query = input.trim().toLowerCase();

              return customFields.reduce<SelectionOption<string>[]>((acc, customField) => {
                const fieldKey = customField.key.toLowerCase();
                const fieldLabel = customField.label.toLowerCase();

                if (!query || fieldKey.includes(query) || fieldLabel.includes(query)) {
                  acc.push(toSelectionOption(customField));
                }

                return acc;
              }, []);
            },
            resolve: async (value) => {
              const customFields = await getCustomFieldsForWorkflowOwner();
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
};
