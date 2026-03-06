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
  addCategoryStepCommonDefinition,
  AddCategoryStepTypeId,
} from '../../common/workflows/steps/add_category';
import * as i18n from '../../common/workflows/translations';

export const addCategoryStepDefinition = createPublicStepDefinition({
  ...addCategoryStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.ADD_CATEGORY_STEP_LABEL,
  description: i18n.ADD_CATEGORY_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_CATEGORY_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Set case category
\`\`\`yaml
- name: set_case_category
  type: ${AddCategoryStepTypeId}
  with:
    case_id: "abc-123-def-456"
    category: "Malware"
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
