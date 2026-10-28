/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InlineActionStep } from '@kbn/alerting-v2-utils';
import type { InlineWorkflowActionDraft } from '../types';

export interface InlineActionStepDefinition extends InlineActionStep {
  description?: string;
  iconType?: string;
  CustomComponent?: React.ComponentType<{
    value: InlineWorkflowActionDraft;
    onChange: (value: InlineWorkflowActionDraft) => void;
  }>;
}

export interface PayloadVariable {
  path: string;
  detail: string;
  documentation?: string;
}
