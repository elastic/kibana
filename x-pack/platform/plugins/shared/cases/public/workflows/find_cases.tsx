/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { ActionsMenuGroup } from '@kbn/workflows-extensions/public';
import {
  findCasesStepCommonDefinition,
  FindCasesStepTypeId,
} from '../../common/workflows/steps/find_cases';
import * as i18n from './translations';

export const findCasesStepDefinition: PublicStepDefinition = {
  ...findCasesStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/magnify').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.FIND_CASES_STEP_LABEL,
  description: i18n.FIND_CASES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.FIND_CASES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Basic case search
\`\`\`yaml
- name: find_cases
  type: ${FindCasesStepTypeId}
  with:
    owner: "securitySolution"
    search: "critical incident"
\`\`\``,
      `## Filter and sort found cases
\`\`\`yaml
- name: find_open_cases
  type: ${FindCasesStepTypeId}
  with:
    owner: "securitySolution"
    status: "open"
    severity: ["high", "critical"]
    tags: ["investigation"]
    sortField: "updatedAt"
    sortOrder: "desc"
    page: 1
    perPage: 20
\`\`\``,
    ],
  },
  actionsMenuGroup: ActionsMenuGroup.kibana,
};
