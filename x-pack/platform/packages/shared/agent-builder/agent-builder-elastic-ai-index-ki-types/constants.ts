/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Every KI type id for the content Kibana indexes into the AI Index via the Semantic Metadata Layer (SML).
 *
 * Each id is used in two places that must agree:
 * - the `id` of the `SmlTypeDefinition` the owning plugin registers with `agentBuilderSml.registerType()`
 * - the `aiIndex: { read: [...] }` entry of the feature privilege that grants read access to that content
 *
 * They live here so both sides can import the same constant. Neither side can import from the other: the
 * plugin registering the SML type and the plugin declaring the privilege sit on opposite ends of a plugin
 * dependency chain, so an import either way would be circular.
 *
 * An id also ends up in the generated privilege action (`ai_index:<kiType>/read`) and on the documents
 * already in the AI Index, so renaming one means updating the serverless authorization expectations and
 * waiting for the next crawl to re-index.
 */

export const VISUALIZATION_KI_TYPE = 'visualization' as const;
export const DASHBOARD_SML_TYPE = 'dashboard' as const;
export const CONNECTOR_SML_TYPE = 'connector' as const;
export const SIGNIFICANT_EVENT_SML_TYPE = 'significant_event' as const;
export const WORKFLOW_SML_TYPE = 'workflow' as const;
export const RULE_SML_TYPE = 'alerting_v2_rule' as const;
export const ACTION_POLICY_SML_TYPE = 'alerting_v2_action_policy' as const;
