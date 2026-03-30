/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DynamicStructuredTool } from '@langchain/core/tools';
import { createSubmitTool } from './submit_analysis';

export const submitReviewTool = (): DynamicStructuredTool =>
  createSubmitTool({
    name: 'submit_review',
    description:
      'Submit your completed review. Stores the full review in shared state and returns ' +
      'a summary to the orchestrator. ' +
      'You MUST call this as your final action after completing your review.',
    stateField: 'review',
    contentLabel: 'Review',
    contentDescription: 'The complete review with all issues, details, and recommendations',
    summaryDescription:
      'A concise summary: PASSED or FAILED, number of issues, severity, and which agent should address them',
  });
