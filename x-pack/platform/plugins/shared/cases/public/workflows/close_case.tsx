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
  closeCaseStepCommonDefinition,
  CloseCaseStepTypeId,
} from '../../common/workflows/steps/close_case';
import * as i18n from '../../common/workflows/translations';

export const closeCaseStepDefinition = createPublicStepDefinition({
  ...closeCaseStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.CLOSE_CASE_STEP_LABEL,
  description: i18n.CLOSE_CASE_STEP_DESCRIPTION,
  documentation: {
    details: i18n.CLOSE_CASE_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Close a case
\`\`\`yaml
- name: close_case
  type: ${CloseCaseStepTypeId}
  with:
    case_id: "abc-123-def-456"
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
