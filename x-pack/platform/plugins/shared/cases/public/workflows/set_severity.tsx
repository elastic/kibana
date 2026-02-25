/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  setSeverityStepCommonDefinition,
  SetSeverityStepTypeId,
} from '../../common/workflows/steps/set_severity';
import * as i18n from './translations';

export const createSetSeverityStepDefinition = () => {
  return createPublicStepDefinition({
    ...setSeverityStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.SET_SEVERITY_STEP_LABEL,
    description: i18n.SET_SEVERITY_STEP_DESCRIPTION,
    documentation: {
      details: i18n.SET_SEVERITY_STEP_DOCUMENTATION_DETAILS,
      examples: [
        `## Set case severity
\`\`\`yaml
- name: set_case_severity
  type: ${SetSeverityStepTypeId}
  with:
    case_id: "abc-123-def-456"
    severity: "high"
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
  });
};
