/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { i18n } from '@kbn/i18n';
import { ActionsMenuGroup } from '@kbn/workflows-extensions/public';
import {
  getCaseByIdStepCommonDefinition,
  GetCaseByIdStepTypeId,
} from '../../common/workflows/steps/get_case_by_id';

export const getCaseByIdStepDefinition: PublicStepDefinition = {
  ...getCaseByIdStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/folder_open').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.translate('xpack.cases.workflowSteps.getCaseById.label', {
    defaultMessage: 'Get case by ID',
  }),
  description: i18n.translate('xpack.cases.workflowSteps.getCaseById.description', {
    defaultMessage: 'Retrieves a case using its unique identifier',
  }),
  documentation: {
    details: i18n.translate('xpack.cases.workflowSteps.getCaseById.documentation.details', {
      defaultMessage:
        'This step retrieves a complete case object from the cases system using its ID. You can optionally include comments and attachments in the response.',
    }),
    examples: [
      `## Basic usage
\`\`\`yaml
- name: get_case
  type: ${GetCaseByIdStepTypeId}
  with:
    id: "abc-123-def-456"
\`\`\``,
      `## With comments included
\`\`\`yaml
- name: get_case_with_comments
  type: ${GetCaseByIdStepTypeId}
  with:
    id: "abc-123-def-456"
    include_comments: true
\`\`\``,
      `## Using case from previous step
\`\`\`yaml
- name: find_cases
  type: cases.findCases
  with:
    search_term: "critical incident"

- name: get_first_case
  type: ${GetCaseByIdStepTypeId}
  with:
    id: \${{ steps.find_cases.output.cases[0].id }}
    include_comments: true
\`\`\``,
    ],
  },
  actionsMenuGroup: ActionsMenuGroup.kibana,
};
