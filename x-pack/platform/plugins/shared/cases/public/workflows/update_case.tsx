/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  updateCaseStepCommonDefinition,
  UpdateCaseStepTypeId,
} from '../../common/workflows/steps/update_case';
import * as i18n from './translations';
// import { caseIdInputEditorHandlers } from './case_id_selection_handler';

export const createUpdateCaseStepDefinition = () => {
  return createPublicStepDefinition({
    ...updateCaseStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.UPDATE_CASE_STEP_LABEL,
    description: i18n.UPDATE_CASE_STEP_DESCRIPTION,
    documentation: {
      details: i18n.UPDATE_CASE_STEP_DOCUMENTATION_DETAILS,
      examples: [
        `## Update case status and severity
\`\`\`yaml
- name: update_case
  type: ${UpdateCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
    updates:
      status: "in-progress"
      severity: "high"
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
    // TODO: enable one case_id can be a template AND an inputHandler
    // editorHandlers: caseIdInputEditorHandlers,
  });
};
