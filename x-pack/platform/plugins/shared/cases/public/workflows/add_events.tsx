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
  addEventsStepCommonDefinition,
  AddEventsStepTypeId,
} from '../../common/workflows/steps/add_events';
import * as i18n from '../../common/workflows/translations';

export const addEventsStepDefinition = createPublicStepDefinition({
  ...addEventsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.ADD_EVENTS_STEP_LABEL,
  description: i18n.ADD_EVENTS_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_EVENTS_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add events to case
\`\`\`yaml
- name: add_events
  type: ${AddEventsStepTypeId}
  with:
    case_id: "abc-123-def-456"
    events:
      - eventId: "event-1"
        index: ".ds-logs-*"
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
