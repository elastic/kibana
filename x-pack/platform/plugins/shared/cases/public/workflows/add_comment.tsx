/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  addCommentStepCommonDefinition,
  AddCommentStepTypeId,
} from '../../common/workflows/steps/add_comment';
import * as i18n from './translations';
// import { caseIdInputEditorHandlers } from './case_id_selection_handler';

export const addCommentStepDefinition = createPublicStepDefinition({
  ...addCommentStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/comment').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.ADD_COMMENT_STEP_LABEL,
  description: i18n.ADD_COMMENT_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_COMMENT_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add comment to a case
\`\`\`yaml
- name: add_case_comment
  type: ${AddCommentStepTypeId}
  with:
    case_id: "abc-123-def-456"
    comment: "Investigating this incident now."
\`\`\``,
    ],
  },
  actionsMenuGroup: ActionsMenuGroup.kibana,
  // TODO: enable one case_id can be a template AND an inputHandler
  // editorHandlers: caseIdInputEditorHandlers,
});
