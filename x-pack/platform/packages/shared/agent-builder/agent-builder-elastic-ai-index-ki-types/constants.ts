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
 * plugin registering the KI type and the plugin declaring the privilege sit on opposite ends of a plugin
 * dependency chain, so an import either way would be circular.
 *
 * An id also becomes part of the generated privilege action (`ai_index:<kiType>/read`) and is stamped on every
 * document the crawler writes (`type_id`, plus the `<kiType>://<origin_id>` origin URI). Renaming an id means
 * new documents will be added by the crawler, but the old documents will remain in the index until they are manually deleted.
 * User roles need no changes. A role grants a feature privilege by name (e.g. `feature_dashboard.all`), never an
 * individual action string, and Kibana rebuilds the action list behind each name from the feature registration on
 * startup — so roles pick up the renamed action on their own.
 */

export const VISUALIZATION_KI_TYPE = 'visualization' as const;
export const DASHBOARD_KI_TYPE = 'dashboard' as const;
export const CONNECTOR_KI_TYPE = 'connector' as const;
export const SIGNIFICANT_EVENT_KI_TYPE = 'significant_event' as const;
export const WORKFLOW_KI_TYPE = 'workflow' as const;
export const RULE_KI_TYPE = 'alerting_v2_rule' as const;
export const ACTION_POLICY_KI_TYPE = 'alerting_v2_action_policy' as const;
export const AGENT_MEMORY_KI_TYPE = 'agent_memory' as const;
