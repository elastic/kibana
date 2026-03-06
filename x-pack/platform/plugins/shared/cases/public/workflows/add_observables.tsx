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
  addObservablesStepCommonDefinition,
  AddObservablesStepTypeId,
} from '../../common/workflows/steps/add_observables';
import * as i18n from '../../common/workflows/translations';

export const addObservablesStepDefinition = createPublicStepDefinition({
  ...addObservablesStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/plus_circle').then(({ icon }) => ({
      default: icon,
    }))
  ),
  label: i18n.ADD_OBSERVABLES_STEP_LABEL,
  description: i18n.ADD_OBSERVABLES_STEP_DESCRIPTION,
  documentation: {
    details: i18n.ADD_OBSERVABLES_STEP_DOCUMENTATION_DETAILS,
    examples: [
      `## Add observables to case
\`\`\`yaml
- name: add_observables
  type: ${AddObservablesStepTypeId}
  with:
    case_id: "abc-123-def-456"
    observables:
      - typeKey: "ip"
        value: "10.0.0.8"
        description: "Source IP"
\`\`\``,
    ],
  },
  category: StepCategory.Kibana,
});
