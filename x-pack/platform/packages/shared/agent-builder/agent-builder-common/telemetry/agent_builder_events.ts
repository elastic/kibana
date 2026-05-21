/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventTypeOpts } from '@kbn/core/public';

/**
 * Event type constants for Agent Builder telemetry events.
 */
const TELEMETRY_PREFIX = 'agent_builder';
export const AGENT_BUILDER_EVENT_TYPES = {
  OptInAction: `${TELEMETRY_PREFIX}_opt_in_action`,
  OptOut: `${TELEMETRY_PREFIX}_opt_out`,
  UiClick: `${TELEMETRY_PREFIX}_ui_click`,
  AddToChatClicked: `${TELEMETRY_PREFIX}_add_to_chat_clicked`,
  AgentCreated: `${TELEMETRY_PREFIX}_agent_created`,
  AgentUpdated: `${TELEMETRY_PREFIX}_agent_updated`,
  ToolCreated: `${TELEMETRY_PREFIX}_tool_created`,
  SkillCreated: `${TELEMETRY_PREFIX}_skill_created`,
  SkillUpdated: `${TELEMETRY_PREFIX}_skill_updated`,
  SkillDeleted: `${TELEMETRY_PREFIX}_skill_deleted`,
  SkillInvoked: `${TELEMETRY_PREFIX}_skill_invoked`,
  PluginImported: `${TELEMETRY_PREFIX}_plugin_imported`,
  RoundComplete: `${TELEMETRY_PREFIX}_round_complete`,
  RoundError: `${TELEMETRY_PREFIX}_round_error`,
  ToolCallSuccess: `${TELEMETRY_PREFIX}_tool_call_success`,
  ToolCallError: `${TELEMETRY_PREFIX}_tool_call_error`,
} as const;

export type OptInSource =
  | 'security_settings_menu'
  | 'stack_management'
  | 'security_ab_tour'
  | 'agent_builder_nav_control';

export type OptInAction =
  | 'step_reached'
  | 'confirmation_shown'
  | 'confirmed'
  | 'canceled'
  | 'error';

export interface ReportOptInActionParams {
  action: OptInAction;
  source: OptInSource;
  /** Announcement modal design variant when the event originates from that flow. */
  announcement_variant?: '1a' | '1b' | '2a';
  /** Whether the user had prior Observability or Security AI Assistant conversations (current space). */
  had_prior_ai_assistant_usage?: boolean;
}

export interface ReportOptOutParams {
  source: 'security_settings_menu' | 'stack_management' | 'agent_builder_nav_control';
  announcement_variant?: '1a' | '1b' | '2a';
  had_prior_ai_assistant_usage?: boolean;
}

export interface ReportAddToChatClickedParams {
  pathway: string;
  attachments?: string[];
}

export type AgentBuilderUiClickElementKind =
  | 'button'
  | 'link'
  | 'role_button'
  | 'input_button'
  | 'other';

export interface ReportUiClickParams {
  ebt_element: string;
  ebt_action?: string;
  ebt_detail?: string;
  element_kind: AgentBuilderUiClickElementKind;
  location_pathname: string;
}

export interface ReportRoundCompleteParams {
  agent_id: string;
  attachments?: string[];
  conversation_id?: string;
  execution_id?: string;
  input_tokens: number;
  llm_calls: number;
  message_length: number;
  model?: string;
  model_provider?: string;
  output_tokens: number;
  round_id: string;
  response_length: number;
  round_number: number;
  round_status: string;
  started_at: string;
  time_to_first_token: number;
  time_to_last_token: number;
  tool_calls: number;
  tool_call_errors: number;
  tools_invoked: string[];
}

export interface ReportRoundErrorParams {
  error_type: string;
  error_message: string;
  model_provider?: string;
  conversation_id?: string;
  execution_id?: string;
  agent_id: string;
  round_id?: string;
}

export interface ReportAgentCreatedParams {
  agent_id: string;
  tool_ids: string[];
}

export interface ReportAgentUpdatedParams {
  agent_id: string;
  tool_ids: string[];
}

export interface ReportToolCreatedParams {
  tool_id: string;
  tool_type: string;
}

/** Origin of a skill: `custom` for user-created via the public API, `plugin` for plugin-bundled. */
export type SkillCreationOrigin = 'custom' | 'plugin';

/** Origin of a skill at invocation time: `builtin`, `custom` (user-created), or `plugin` (plugin-installed). */
export type SkillInvocationOrigin = 'builtin' | 'custom' | 'plugin';

/**
 * Solution area a skill belongs to. Built-in skills are classified by their `basePath`.
 * Custom (user-created) skills are reported as `custom`. Plugin-backed skills are
 * reported as `plugin`. `unknown` is reserved for built-ins whose `basePath` does not
 * match any known prefix.
 */
export type SkillSolutionArea =
  | 'security'
  | 'observability'
  | 'search'
  | 'platform'
  | 'custom'
  | 'plugin'
  | 'unknown';

/** Telemetry params reported when a user-created skill is created. */
export interface ReportSkillCreatedParams {
  /**
   * Identifier of the created skill, normalized for privacy. Custom skills are
   * reported as `custom-<sha256_prefix>`; plugin-bundled creates as
   * `plugin-<plugin_id_hash>-<sha256_prefix>`.
   */
  skill_id: string;
  /** Optional origin (`custom` for direct API creates, `plugin` for plugin-bundled creates). */
  origin?: SkillCreationOrigin;
}

/** Telemetry params reported when a user-created skill is updated. */
export interface ReportSkillUpdatedParams {
  /**
   * Identifier of the updated skill, normalized for privacy. Custom skills are
   * reported as `custom-<sha256_prefix>`; plugin-bundled updates as
   * `plugin-<plugin_id_hash>-<sha256_prefix>`.
   */
  skill_id: string;
  /** Optional origin (`custom` for direct API updates, `plugin` for plugin-bundled updates). */
  origin?: SkillCreationOrigin;
}

/** Telemetry params reported when a user-created skill is deleted. */
export interface ReportSkillDeletedParams {
  /**
   * Identifier of the deleted skill, normalized for privacy. Custom skills are
   * reported as `custom-<sha256_prefix>`; plugin-bundled deletes as
   * `plugin-<plugin_id_hash>-<sha256_prefix>`.
   */
  skill_id: string;
  /** Optional origin (`custom` for direct API deletes, `plugin` for plugin-bundled deletes). */
  origin?: SkillCreationOrigin;
}

/** Telemetry params reported when a skill is invoked (loaded into the active tool set). */
export interface ReportSkillInvokedParams {
  /**
   * ID of the invoked skill. Built-in skills keep their ID; custom skills are reported as
   * `custom-<sha256_prefix>`; plugin-backed skills as `plugin-<plugin_id_hash>-<sha256_prefix>`.
   */
  skill_id: string;
  /** Where this skill came from. */
  origin: SkillInvocationOrigin;
  /** Solution area derived from the skill's `basePath` (built-ins) or origin. */
  solution_area: SkillSolutionArea;
  /** Normalized plugin ID. Present when `origin === 'plugin'`. */
  plugin_id?: string;
  /** Normalized agent ID running this skill, when known. */
  agent_id?: string;
  /** Conversation ID, when known. */
  conversation_id?: string;
  /** Agent execution ID, when known. */
  execution_id?: string;
  /** Number of tools dynamically registered by this skill load. */
  tool_count: number;
}

/** Telemetry params reported when a custom plugin is imported (URL or upload). */
export interface ReportPluginImportedParams {
  /** Normalized plugin ID. */
  plugin_id: string;
  /** Where the plugin came from. */
  source_type: 'url' | 'upload';
  /** Number of persisted skills bundled with the plugin. */
  skill_count: number;
}

export interface ReportToolCallSuccessParams {
  tool_id: string;
  tool_call_id: string;
  source: string;
  agent_id?: string;
  conversation_id?: string;
  execution_id?: string;
  model?: string;
  result_types: string[];
  duration_ms: number;
}

export interface ReportToolCallErrorParams {
  tool_id: string;
  tool_call_id: string;
  source: string;
  agent_id?: string;
  conversation_id?: string;
  execution_id?: string;
  model?: string;
  error_type: string;
  error_message: string;
  duration_ms: number;
}

export interface AgentBuilderTelemetryEventsMap {
  [AGENT_BUILDER_EVENT_TYPES.OptInAction]: ReportOptInActionParams;
  [AGENT_BUILDER_EVENT_TYPES.OptOut]: ReportOptOutParams;
  [AGENT_BUILDER_EVENT_TYPES.UiClick]: ReportUiClickParams;
  [AGENT_BUILDER_EVENT_TYPES.AddToChatClicked]: ReportAddToChatClickedParams;
  [AGENT_BUILDER_EVENT_TYPES.AgentCreated]: ReportAgentCreatedParams;
  [AGENT_BUILDER_EVENT_TYPES.AgentUpdated]: ReportAgentUpdatedParams;
  [AGENT_BUILDER_EVENT_TYPES.ToolCreated]: ReportToolCreatedParams;
  /** Fired when a user-created skill is created. */
  [AGENT_BUILDER_EVENT_TYPES.SkillCreated]: ReportSkillCreatedParams;
  /** Fired when a user-created skill is updated. */
  [AGENT_BUILDER_EVENT_TYPES.SkillUpdated]: ReportSkillUpdatedParams;
  /** Fired when a user-created skill is deleted. */
  [AGENT_BUILDER_EVENT_TYPES.SkillDeleted]: ReportSkillDeletedParams;
  /** Fired when a skill is invoked (its tools are dynamically registered for the agent). */
  [AGENT_BUILDER_EVENT_TYPES.SkillInvoked]: ReportSkillInvokedParams;
  /** Fired when a custom plugin is imported. */
  [AGENT_BUILDER_EVENT_TYPES.PluginImported]: ReportPluginImportedParams;
  [AGENT_BUILDER_EVENT_TYPES.RoundComplete]: ReportRoundCompleteParams;
  [AGENT_BUILDER_EVENT_TYPES.RoundError]: ReportRoundErrorParams;
  [AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess]: ReportToolCallSuccessParams;
  [AGENT_BUILDER_EVENT_TYPES.ToolCallError]: ReportToolCallErrorParams;
}

export type AgentBuilderTelemetryEvent =
  | EventTypeOpts<ReportOptInActionParams>
  | EventTypeOpts<ReportOptOutParams>
  | EventTypeOpts<ReportUiClickParams>
  | EventTypeOpts<ReportAddToChatClickedParams>
  | EventTypeOpts<ReportAgentCreatedParams>
  | EventTypeOpts<ReportAgentUpdatedParams>
  | EventTypeOpts<ReportToolCreatedParams>
  | EventTypeOpts<ReportSkillCreatedParams>
  | EventTypeOpts<ReportSkillUpdatedParams>
  | EventTypeOpts<ReportSkillDeletedParams>
  | EventTypeOpts<ReportSkillInvokedParams>
  | EventTypeOpts<ReportPluginImportedParams>
  | EventTypeOpts<ReportRoundCompleteParams>
  | EventTypeOpts<ReportRoundErrorParams>
  | EventTypeOpts<ReportToolCallSuccessParams>
  | EventTypeOpts<ReportToolCallErrorParams>;
// Type union of all event type strings for use in union types
export type AgentBuilderEventTypes =
  | typeof AGENT_BUILDER_EVENT_TYPES.OptInAction
  | typeof AGENT_BUILDER_EVENT_TYPES.OptOut
  | typeof AGENT_BUILDER_EVENT_TYPES.UiClick
  | typeof AGENT_BUILDER_EVENT_TYPES.AddToChatClicked
  | typeof AGENT_BUILDER_EVENT_TYPES.AgentCreated
  | typeof AGENT_BUILDER_EVENT_TYPES.AgentUpdated
  | typeof AGENT_BUILDER_EVENT_TYPES.ToolCreated
  | typeof AGENT_BUILDER_EVENT_TYPES.SkillCreated
  | typeof AGENT_BUILDER_EVENT_TYPES.SkillUpdated
  | typeof AGENT_BUILDER_EVENT_TYPES.SkillDeleted
  | typeof AGENT_BUILDER_EVENT_TYPES.SkillInvoked
  | typeof AGENT_BUILDER_EVENT_TYPES.PluginImported
  | typeof AGENT_BUILDER_EVENT_TYPES.RoundComplete
  | typeof AGENT_BUILDER_EVENT_TYPES.RoundError
  | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess
  | typeof AGENT_BUILDER_EVENT_TYPES.ToolCallError;

const OPT_IN_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.OptInAction,
  schema: {
    action: {
      type: 'keyword',
      _meta: {
        description:
          'Action taken in the opt-in flow (step_reached|confirmation_shown|confirmed|canceled)',
        optional: false,
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Source of the opt-in action (security_settings_menu|stack_management|security_ab_tour|agent_builder_nav_control)',
        optional: false,
      },
    },
    announcement_variant: {
      type: 'keyword',
      _meta: {
        description: 'Agent Builder announcement modal variant (1a|1b|2a)',
        optional: true,
      },
    },
    had_prior_ai_assistant_usage: {
      type: 'boolean',
      _meta: {
        description: 'Whether the user had prior AI Assistant conversations in the current space',
        optional: true,
      },
    },
  },
};

const OPT_OUT_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.OptOut,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Source of the opt-out action (security_settings_menu|stack_management|agent_builder_nav_control)',
        optional: false,
      },
    },
    announcement_variant: {
      type: 'keyword',
      _meta: {
        description: 'Agent Builder announcement modal variant (1a|1b|2a)',
        optional: true,
      },
    },
    had_prior_ai_assistant_usage: {
      type: 'boolean',
      _meta: {
        description: 'Whether the user had prior AI Assistant conversations in the current space',
        optional: true,
      },
    },
  },
};

const UI_CLICK_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.UiClick,
  schema: {
    ebt_element: {
      type: 'keyword',
      _meta: {
        description:
          'Primary click identity from data-ebt-element (nearest ancestor from the interactive element upward)',
        optional: false,
      },
    },
    ebt_action: {
      type: 'keyword',
      _meta: {
        description: 'Optional data-ebt-action from DOM',
        optional: true,
      },
    },
    ebt_detail: {
      type: 'keyword',
      _meta: {
        description: 'Optional data-ebt-detail from DOM',
        optional: true,
      },
    },
    element_kind: {
      type: 'keyword',
      _meta: {
        description: 'Kind of activated control (button|link|role_button|input_button|other)',
        optional: false,
      },
    },
    location_pathname: {
      type: 'keyword',
      _meta: {
        description: 'Agent Builder app pathname when the click occurred',
        optional: false,
      },
    },
  },
};

const ADD_TO_CHAT_CLICKED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.AddToChatClicked,
  schema: {
    pathway: {
      type: 'keyword',
      _meta: {
        description:
          'Pathway where Add to Chat was clicked (alerts_flyout|entity_flyout|rules_table|rule_creation|attack_discovery|other)',
        optional: false,
      },
    },
    attachments: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Type of attachment',
        },
      },
      _meta: {
        description: 'Types of attachments',
        optional: true,
      },
    },
  },
};

const AGENT_CREATED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.AgentCreated,
  schema: {
    agent_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the created agent (normalized: built-in agents keep ID, custom agents become "custom-<sha256_prefix>")',
        optional: false,
      },
    },
    tool_ids: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'Tool ID included in the created agent (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>")',
        },
      },
      _meta: {
        description:
          'Tool IDs included in the created agent (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>"). This is a de-duplicated list of tool IDs (one entry per tool, not per invocation).',
        optional: false,
      },
    },
  },
};

const AGENT_UPDATED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.AgentUpdated,
  schema: {
    agent_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the updated agent (normalized: built-in agents keep ID, custom agents become "custom-<sha256_prefix>")',
        optional: false,
      },
    },
    tool_ids: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'Tool ID included in the updated agent (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>")',
        },
      },
      _meta: {
        description:
          'Tool IDs included in the updated agent (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>"). This is a de-duplicated list of tool IDs (one entry per tool, not per invocation).',
        optional: false,
      },
    },
  },
};

const TOOL_CREATED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.ToolCreated,
  schema: {
    tool_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the created tool (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>")',
        optional: false,
      },
    },
    tool_type: {
      type: 'keyword',
      _meta: {
        description: 'Type of tool created (esql|index_search|workflow|mcp|...)',
        optional: false,
      },
    },
  },
};

const SKILL_CREATED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.SkillCreated,
  schema: {
    skill_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the created skill (normalized: custom skills become "custom-<sha256_prefix>", plugin-bundled creates become "plugin-<plugin_id_hash>-<sha256_prefix>")',
        optional: false,
      },
    },
    origin: {
      type: 'keyword',
      _meta: {
        description:
          'Origin of the created skill (custom for direct API creates, plugin for plugin-bundled creates)',
        optional: true,
      },
    },
  },
};

const SKILL_UPDATED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.SkillUpdated,
  schema: {
    skill_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the updated skill (normalized: custom skills become "custom-<sha256_prefix>", plugin-bundled updates become "plugin-<plugin_id_hash>-<sha256_prefix>")',
        optional: false,
      },
    },
    origin: {
      type: 'keyword',
      _meta: {
        description:
          'Origin of the updated skill (custom for direct API updates, plugin for plugin-bundled updates)',
        optional: true,
      },
    },
  },
};

const SKILL_DELETED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.SkillDeleted,
  schema: {
    skill_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the deleted skill (normalized: custom skills become "custom-<sha256_prefix>", plugin-bundled deletes become "plugin-<plugin_id_hash>-<sha256_prefix>")',
        optional: false,
      },
    },
    origin: {
      type: 'keyword',
      _meta: {
        description:
          'Origin of the deleted skill (custom for direct API deletes, plugin for plugin-bundled deletes)',
        optional: true,
      },
    },
  },
};

const SKILL_INVOKED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.SkillInvoked,
  schema: {
    skill_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the invoked skill (normalized: built-in skills keep ID, custom skills become "custom-<sha256_prefix>", plugin-backed skills become "plugin-<plugin_id_hash>-<sha256_prefix>")',
        optional: false,
      },
    },
    origin: {
      type: 'keyword',
      _meta: {
        description: 'Origin of the invoked skill (builtin|custom|plugin)',
        optional: false,
      },
    },
    solution_area: {
      type: 'keyword',
      _meta: {
        description:
          'Solution area the skill belongs to (security|observability|search|platform|custom|plugin|unknown)',
        optional: false,
      },
    },
    plugin_id: {
      type: 'keyword',
      _meta: {
        description: 'Normalized plugin ID, present when origin is "plugin"',
        optional: true,
      },
    },
    agent_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the agent invoking the skill (normalized: built-in agents keep ID, custom agents become "custom-<sha256_prefix>")',
        optional: true,
      },
    },
    conversation_id: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: true,
      },
    },
    execution_id: {
      type: 'keyword',
      _meta: {
        description: 'Agent execution ID',
        optional: true,
      },
    },
    tool_count: {
      type: 'integer',
      _meta: {
        description: 'Number of tools dynamically registered by this skill load',
        optional: false,
      },
    },
  },
};

const PLUGIN_IMPORTED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.PluginImported,
  schema: {
    plugin_id: {
      type: 'keyword',
      _meta: {
        description: 'Normalized plugin ID (custom-<sha256_prefix>)',
        optional: false,
      },
    },
    source_type: {
      type: 'keyword',
      _meta: {
        description: 'Where the plugin came from (url|upload)',
        optional: false,
      },
    },
    skill_count: {
      type: 'integer',
      _meta: {
        description: 'Number of persisted skills bundled with the plugin',
        optional: false,
      },
    },
  },
};

const ROUND_COMPLETE_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.RoundComplete,
  schema: {
    agent_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the agent (normalized: built-in agents keep ID, custom agents become "custom-<sha256_prefix>")',
        optional: false,
      },
    },
    attachments: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Type of attachment',
        },
      },
      _meta: {
        description: 'Types of attachments',
        optional: true,
      },
    },
    conversation_id: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: true,
      },
    },
    execution_id: {
      type: 'keyword',
      _meta: {
        description: 'Execution ID',
        optional: true,
      },
    },
    input_tokens: {
      type: 'integer',
      _meta: {
        description: 'Total number of input tokens sent during this round',
        optional: false,
      },
    },
    llm_calls: {
      type: 'integer',
      _meta: {
        description: 'Number of LLM calls performed during this round',
        optional: false,
      },
    },
    output_tokens: {
      type: 'integer',
      _meta: {
        description: 'Total number of output tokens received during this round',
        optional: false,
      },
    },
    round_id: {
      type: 'keyword',
      _meta: {
        description: 'Unique ID of the conversation round',
        optional: false,
      },
    },
    message_length: {
      type: 'integer',
      _meta: {
        description: 'Length of the user message in characters',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The exact model used, if available',
        optional: true,
      },
    },
    model_provider: {
      type: 'keyword',
      _meta: {
        description: 'LLM model provider (OpenAI|Google|Anthropic|Elastic)',
        optional: true,
      },
    },
    response_length: {
      type: 'integer',
      _meta: {
        description: 'Length of the LLM response in characters',
        optional: false,
      },
    },
    round_number: {
      type: 'integer',
      _meta: {
        description: 'Round number in the conversation',
        optional: false,
      },
    },
    round_status: {
      type: 'keyword',
      _meta: {
        description: 'Status the round was in after current execution',
        optional: false,
      },
    },
    started_at: {
      type: 'date',
      _meta: {
        description: 'When the round started',
        optional: false,
      },
    },
    time_to_first_token: {
      type: 'integer',
      _meta: {
        description: 'Time from round start to first token arrival, in ms',
        optional: false,
      },
    },
    time_to_last_token: {
      type: 'integer',
      _meta: {
        description: 'Time from round start to last token arrival, in ms',
        optional: false,
      },
    },
    tools_invoked: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'Tool ID invoked (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>")',
        },
      },
      _meta: {
        description:
          'Tool IDs invoked in the round (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>"). Intentionally includes duplicates (one entry per tool call) so counts per tool can be computed downstream by aggregating over this array.',
        optional: false,
      },
    },
    tool_calls: {
      type: 'integer',
      _meta: {
        description: 'Total number of tool calls performed in this round',
        optional: false,
      },
    },
    tool_call_errors: {
      type: 'integer',
      _meta: {
        description: 'Number of tool erroring tool calls performed in this round',
        optional: false,
      },
    },
  },
};

const ROUND_ERROR_SCHEMA: AgentBuilderTelemetryEvent['schema'] = {
  error_type: {
    type: 'keyword',
    _meta: {
      description: 'The type/name of the error that occurred',
      optional: false,
    },
  },
  error_message: {
    type: 'text',
    _meta: {
      description: 'The error message describing what went wrong',
      optional: false,
    },
  },
  round_id: {
    type: 'keyword',
    _meta: {
      description: 'Unique ID of the conversation round (when available)',
      optional: true,
    },
  },
  model_provider: {
    type: 'keyword',
    _meta: {
      description: 'LLM model provider (OpenAI|Google|Anthropic|Elastic)',
      optional: true,
    },
  },
  conversation_id: {
    type: 'keyword',
    _meta: {
      description: 'The ID of the conversation where the error occurred',
      optional: true,
    },
  },
  execution_id: {
    type: 'keyword',
    _meta: {
      description: 'Execution ID',
      optional: true,
    },
  },
  agent_id: {
    type: 'keyword',
    _meta: {
      description: 'The ID of the agent involved in the conversation',
      optional: false,
    },
  },
};

const ROUND_ERROR_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.RoundError,
  schema: ROUND_ERROR_SCHEMA,
};

const TOOL_CALL_SUCCESS_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.ToolCallSuccess,
  schema: {
    agent_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the agent (normalized: built-in agents keep ID, custom agents become "custom-<sha256_prefix>")',
        optional: true,
      },
    },
    conversation_id: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: true,
      },
    },
    execution_id: {
      type: 'keyword',
      _meta: {
        description: 'Agent execution ID',
        optional: true,
      },
    },
    tool_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the tool (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>")',
        optional: false,
      },
    },
    tool_call_id: {
      type: 'keyword',
      _meta: {
        description: 'Unique ID of this tool call invocation',
        optional: false,
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description: 'Where the tool was called from (agent|user|mcp|api|unknown)',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The exact model used, if available',
        optional: true,
      },
    },
    duration_ms: {
      type: 'integer',
      _meta: {
        description: 'Duration of the tool call in milliseconds',
        optional: false,
      },
    },
    result_types: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Type of the tool result (resource|esql_results|error|other|...)',
        },
      },
      _meta: {
        description: 'Types of results returned by the tool call',
        optional: false,
      },
    },
  },
};

const TOOL_CALL_ERROR_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.ToolCallError,
  schema: {
    agent_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the agent (normalized: built-in agents keep ID, custom agents become "custom-<sha256_prefix>")',
        optional: true,
      },
    },
    conversation_id: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: true,
      },
    },
    execution_id: {
      type: 'keyword',
      _meta: {
        description: 'Agent execution ID',
        optional: true,
      },
    },
    tool_id: {
      type: 'keyword',
      _meta: {
        description:
          'ID of the tool (normalized: built-in tools keep ID, custom tools become "custom-<sha256_prefix>")',
        optional: false,
      },
    },
    tool_call_id: {
      type: 'keyword',
      _meta: {
        description: 'Unique ID of this tool call invocation',
        optional: false,
      },
    },
    source: {
      type: 'keyword',
      _meta: {
        description: 'Where the tool was called from (agent|user|mcp|api|unknown)',
        optional: false,
      },
    },
    model: {
      type: 'keyword',
      _meta: {
        description: 'The exact model used, if available',
        optional: true,
      },
    },
    duration_ms: {
      type: 'integer',
      _meta: {
        description: 'Duration of the tool call in milliseconds',
        optional: false,
      },
    },
    error_type: {
      type: 'keyword',
      _meta: {
        description: 'The type/name of the error that occurred',
        optional: false,
      },
    },
    error_message: {
      type: 'text',
      _meta: {
        description: 'The error message describing what went wrong',
        optional: false,
      },
    },
  },
};

export const agentBuilderPublicEbtEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  OPT_IN_EVENT,
  OPT_OUT_EVENT,
  UI_CLICK_EVENT,
  ADD_TO_CHAT_CLICKED_EVENT,
];

export const agentBuilderServerEbtEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  AGENT_CREATED_EVENT,
  AGENT_UPDATED_EVENT,
  TOOL_CREATED_EVENT,
  SKILL_CREATED_EVENT,
  SKILL_UPDATED_EVENT,
  SKILL_DELETED_EVENT,
  SKILL_INVOKED_EVENT,
  PLUGIN_IMPORTED_EVENT,
  ROUND_COMPLETE_EVENT,
  ROUND_ERROR_EVENT,
  TOOL_CALL_SUCCESS_EVENT,
  TOOL_CALL_ERROR_EVENT,
];
