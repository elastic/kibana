/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PublicStepDefinition } from '@kbn/workflows-extensions/public';
import { StepCategory } from '@kbn/workflows';
import {
  KI_SELECT_STREAMS_STEP_TYPE,
  kiSelectStreamsInputSchema,
  kiSelectStreamsOutputSchema,
} from '@kbn/streams-plugin/common';

export const kiSelectStreamsPublicStepDefinition: PublicStepDefinition = {
  id: KI_SELECT_STREAMS_STEP_TYPE,
  label: 'KI Select Streams',
  description:
    'Selects streams that need knowledge indicator extraction and schedules identification tasks.',
  category: StepCategory.Kibana,
  stability: 'tech_preview',
  inputSchema: kiSelectStreamsInputSchema,
  outputSchema: kiSelectStreamsOutputSchema,
};
