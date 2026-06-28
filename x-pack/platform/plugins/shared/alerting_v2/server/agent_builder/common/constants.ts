/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const ALERTING_NAMESPACE = 'platform.alerting';

const alertingTool = (name: string) => `${ALERTING_NAMESPACE}.${name}`;

export const alertingTools = {
  manageRule: alertingTool('manage_rule'),
  manageActionPolicy: alertingTool('manage_action_policy'),
} as const;

/**
 * Tag automatically applied to every Alerting v2 rule created through Agent
 * Builder. Used to measure adoption (telemetry) and to let users filter
 * agent-created rules in the Rules list. It is a regular, user-editable tag:
 * it is (re-)applied whenever Agent Builder creates or edits a rule, so a tag
 * the user removes is restored the next time the agent touches the rule.
 */
export const AGENT_BUILDER_RULE_TAG = 'agent-builder';
