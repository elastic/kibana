/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StepCategory } from '@kbn/workflows';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  assignCaseStepCommonDefinition,
  AssignCaseStepTypeId,
} from '../../common/workflows/steps/assign_case';
import * as i18n from '../../common/workflows/translations';

export const assignCaseStepDefinition = createPublicStepDefinition({
  ...assignCaseStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.ASSIGN_CASE_STEP_LABEL,
  description: i18n.ASSIGN_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ASSIGN_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Assign users to case
\`\`\`yaml
- name: assign_case_users
  type: ${AssignCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    assignees:
      - uid: "user-123"
      - uid: "user-456"
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
