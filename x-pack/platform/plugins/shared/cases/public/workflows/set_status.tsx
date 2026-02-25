/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionsMenuGroup, createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import {
  setStatusStepCommonDefinition,
  SetStatusStepTypeId,
} from '../../common/workflows/steps/set_status';
import * as i18n from './translations';

export const createSetStatusStepDefinition = () => {
  return createPublicStepDefinition({
    ...setStatusStepCommonDefinition,
    icon: React.lazy(() =>
      import('@elastic/eui/es/components/icon/assets/pencil').then(({ icon }) => ({
        default: icon,
      }))
    ),
    label: i18n.SET_STATUS_STEP_LABEL,
    description: i18n.SET_STATUS_STEP_DESCRIPTION,
    documentation: {
      details: i18n.SET_STATUS_STEP_DOCUMENTATION_DETAILS,
      examples: [
        `## Set case status
\`\`\`yaml
- name: set_case_status
  type: ${SetStatusStepTypeId}
  with:
    case_id: "abc-123-def-456"
    status: "in-progress"
\`\`\``,
      ],
    },
    actionsMenuGroup: ActionsMenuGroup.kibana,
  });
};
