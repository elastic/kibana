/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { z } from '@kbn/zod/v4';
import { EMAIL_PARAMS_SCHEMA, SLACK2_PARAMS_SCHEMA } from './inline_action_params_schemas';

/** Tag on workflows created inline for an action policy. */
export const INLINE_WORKFLOW_TAG = 'alertingv2-action-policy';

export type InlineActionStepType = 'slack2.sendMessage' | 'email';

type Slack2SubAction = 'sendMessage';
type ConnectorTypeSubAction = Slack2SubAction | (string & {});

/** The browser- and server-safe part of an inline action step: how it runs and what it accepts. */
export interface InlineActionStep {
  id: InlineActionStepType;
  label: string;
  connectorTypeId: string;
  connectorTypeSubAction?: ConnectorTypeSubAction;
  /** Default step params as YAML; its templates render an alert summary. */
  paramsTemplate: string;
  paramsSchema: z.ZodObject<Record<string, z.ZodType>, z.core.$strict>;
}

/** The inputs needed to build a single-step workflow for an inline action. */
export interface InlineWorkflowStepDraft {
  stepType: InlineActionStepType;
  connectorId: string | null;
  /** The step params as YAML. */
  params: string;
}

const EMAIL_PARAMS_TEMPLATE = `to: 
  - ""
subject: ""
message: |
  {% for alert in inputs.payload.alerts %}
  - {{ inputs.payload.rules[alert.rule_id].name | default: "Alert" }} ({{ alert.alert_status }}): {{ alert.alert_url }}
  {% endfor %}
`;

// ToDo: add a channel selector to the Slack (v2) step form
const SLACK2_PARAMS_TEMPLATE = `channel: ""
text: |
  {% for alert in inputs.payload.alerts %}
  - {{ inputs.payload.rules[alert.rule_id].name | default: "Alert" }} ({{ alert.alert_status }}): <{{ alert.alert_url }}|View alert>
  {% endfor %}
`;

export const INLINE_ACTION_STEPS: readonly InlineActionStep[] = [
  {
    id: 'email',
    label: i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.stepType.email.label', {
      defaultMessage: 'Email',
    }),
    connectorTypeId: '.email',
    paramsTemplate: EMAIL_PARAMS_TEMPLATE,
    paramsSchema: EMAIL_PARAMS_SCHEMA,
  },
  {
    id: 'slack2.sendMessage',
    label: i18n.translate('xpack.alertingV2.alertingV2RuleForm.actionForm.stepType.slack2.label', {
      defaultMessage: 'Slack',
    }),
    connectorTypeId: '.slack2',
    connectorTypeSubAction: 'sendMessage',
    paramsTemplate: SLACK2_PARAMS_TEMPLATE,
    paramsSchema: SLACK2_PARAMS_SCHEMA,
  },
];

export const getInlineActionStep = (id: InlineActionStepType): InlineActionStep | undefined =>
  INLINE_ACTION_STEPS.find((step) => step.id === id);
