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
  setDescriptionStepCommonDefinition,
  SetDescriptionStepTypeId,
} from '../../common/workflows/steps/set_description';
import * as i18n from '../../common/workflows/translations';

export const setDescriptionStepDefinition = createPublicStepDefinition({
  ...setDescriptionStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.SET_DESCRIPTION_STEP_LABEL,
  description: i18n.SET_DESCRIPTION_STEP_DESCRIPTION,
  documentation: {
    details: i18n.SET_DESCRIPTION_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case description
\`\`\`yaml
- name: set_case_description
  type: ${SetDescriptionStepTypeId}
  with:
    case_id: "abc-123-def-456"
    description: "Updated timeline and investigation findings."
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
