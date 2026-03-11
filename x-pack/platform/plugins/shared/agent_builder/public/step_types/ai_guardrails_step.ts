/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createPublicStepDefinition } from '@kbn/workflows-extensions/public';
import { AiGuardrailsStepCommonDefinition } from '../../common/step_types/ai_guardrails_step';

export const AiGuardrailsStepDefinition = createPublicStepDefinition({
  ...AiGuardrailsStepCommonDefinition,
  icon: React.lazy(() =>
    import('@elastic/eui/es/components/icon/assets/app_security').then(({ icon }) => ({
      default: icon,
    }))
  ),
  editorHandlers: {
    config: {
      'connector-id': {
        connectorIdSelection: {
          connectorTypes: ['inference.unified_completion', 'bedrock', 'gen-ai', 'gemini'],
          enableCreation: false,
        },
      },
    },
  },
});
