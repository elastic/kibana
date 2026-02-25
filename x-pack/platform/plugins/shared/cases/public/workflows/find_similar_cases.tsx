/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  findSimilarCasesStepCommonDefinition,
  FindSimilarCasesStepTypeId,
} from '../../common/workflows/steps/find_similar_cases';
import * as i18n from './translations';

export const createFindSimilarCasesStepDefinition = () => {
  return createPublicStepDefinition({
    ...findSimilarCasesStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/magnify').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.FIND_SIMILAR_CASES_STEP_LABEL,
    description: i18n.FIND_SIMILAR_CASES_STEP_DESCRIPTION,
    documentation: {
      details: i18n.FIND_SIMILAR_CASES_STEP_DOCUMENTATION_DETAILS,
      examples: [
        `## Find similar cases
\`\`\`yaml
- name: find_similar_cases
  type: ${FindSimilarCasesStepTypeId}
  with:
    case_id: "abc-123-def-456"
    page: 1
    perPage: 20
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
  });
};
