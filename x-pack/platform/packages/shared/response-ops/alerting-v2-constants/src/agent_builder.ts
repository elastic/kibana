/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Namespace prefix for Alerting V2 Agent Builder tool ids. */
export const ALERTING_NAMESPACE = 'platform.alerting';

const alertingTool = (name: string) => `${ALERTING_NAMESPACE}.${name}`;

/**
 * Tool ids exposed by the Alerting V2 Agent Builder skills
 * (`rule-management` and `action-policy-management`).
 */
export const ALERTING_TOOL_IDS = {
  manageRule: alertingTool('manage_rule'),
  manageActionPolicy: alertingTool('manage_action_policy'),
} as const;

export const RULE_MANAGEMENT_SKILL_ID = 'rule-management';
export const ACTION_POLICY_MANAGEMENT_SKILL_ID = 'action-policy-management';

/**
 * Initial message sent to the Agent Builder when the user clicks "Create with
 * AI Agent" on the Alerting V2 rules list page / create-rule flyout.
 */
export const CREATE_WITH_AGENT_INITIAL_PROMPT =
  'Load the rule-management skill and help me create a new alerting v2 rule. Ask me what I want to monitor and guide me through the setup.';
