/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { StepCategory } from '@kbn/workflows';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { addTagStepCommonDefinition, AddTagStepTypeId } from '../../common/workflows/steps/add_tag';
import * as i18n from '../../common/workflows/translations';

export const addTagStepDefinition = createPublicStepDefinition({
  ...addTagStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.ADD_TAG_STEP_LABEL,
  description: i18n.ADD_TAG_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_TAG_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case tags
\`\`\`yaml
- name: set_case_tags
  type: ${AddTagStepTypeId}
  with:
    case_id: "abc-123-def-456"
    tags: ["investigation", "high-priority"]
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
