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
  addAlertsStepCommonDefinition,
  AddAlertsStepTypeId,
} from '../../common/workflows/steps/add_alerts';
import * as i18n from '../../common/workflows/translations';

export const addAlertsStepDefinition = createPublicStepDefinition({
  ...addAlertsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.ADD_ALERTS_STEP_LABEL,
  description: i18n.ADD_ALERTS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_ALERTS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add alerts to case
\`\`\`yaml
- name: add_alerts
  type: ${AddAlertsStepTypeId}
  with:
    case_id: "abc-123-def-456"
    alerts:
      - alertId: "alert-1"
        index: ".alerts-security.alerts-default"
        rule:
          id: "rule-1"
          name: "Suspicious process"
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
