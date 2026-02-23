/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  updateCasesStepCommonDefinition,
  UpdateCasesStepTypeId,
} from '../../common/workflows/steps/update_cases';
import * as i18n from './translations';

export const createUpdateCasesStepDefinition = () => {
  return createPublicStepDefinition({
    ...updateCasesStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.UPDATE_CASES_STEP_LABEL,
    description: i18n.UPDATE_CASES_STEP_DESCRIPTION,
    documentation: {
      details: i18n.UPDATE_CASES_STEP_DOCUMENTATION_DETAILS,
      examples: [
        `## Update multiple cases
\`\`\`yaml
- name: update_cases
  type: ${UpdateCasesStepTypeId}
  with:
    cases:
      - case_id: "abc-123-def-456"
        updates:
          status: "in-progress"
      - case_id: "ghi-789-jkl-012"
        updates:
          severity: "high"
\`\`\``,
        `## Update multiple cases with optional versions
\`\`\`yaml
- name: update_cases_with_versions
  type: ${UpdateCasesStepTypeId}
  with:
    cases:
      - case_id: "abc-123-def-456"
        version: "WzQ3LDFd"
        updates:
          title: "Use provided version"
      - case_id: "ghi-789-jkl-012"
        updates:
          title: "Resolve version automatically"
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
  });
};
