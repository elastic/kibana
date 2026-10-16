/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InlineActionStepType, InlineWorkflowActionDraft } from '../types';

type Slack2SubAction = 'sendMessage';
type ConnectorTypeSubAction = Slack2SubAction | (string & {});

export interface InlineActionStepDefinition {
  id: InlineActionStepType;
  label: string;
  description?: string;
  iconType?: string;
  connectorTypeId: string;
  connectorTypeSubAction?: ConnectorTypeSubAction;
  paramsTemplate: string;
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
