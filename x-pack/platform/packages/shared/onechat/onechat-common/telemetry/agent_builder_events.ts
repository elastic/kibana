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
  AddToChatClicked: `${TELEMETRY_PREFIX}_add_to_chat_clicked`,
  MessageSent: `${TELEMETRY_PREFIX}_message_sent`,
  MessageReceived: `${TELEMETRY_PREFIX}_message_received`,
  AgentBuilderError: `${TELEMETRY_PREFIX}_error`,
  /**
   * Legacy onechat event name for errors during conversation.
   *
   * NOTE:
   * - This event name is intentionally NOT prefixed with "Agent Builder" / "agent_builder".
   * - It remains for backwards compatibility with existing onechat telemetry.
   * - Solutions should use `AgentBuilderError` instead so all solution event IDs
   *   stay under the agent_builder prefix.
   */
  ONECHAT_CONVERSE_ERROR: 'onechat_converse_error',
} as const;

export type OptInSource = 'security_settings_menu' | 'stack_management' | 'security_ab_tour';
export type OptInAction = 'step_reached' | 'confirmation_shown' | 'confirmed' | 'canceled';

export interface ReportOptInActionParams {
  action: OptInAction;
  source: OptInSource;
}

export interface ReportOptOutParams {
  source: 'security_settings_menu' | 'stack_management';
}

export interface ReportAddToChatClickedParams {
  pathway: string;
  attachment_type?: string;
  attachment_count?: number;
}

export interface ReportMessageSentParams {
  conversation_id?: string;
  message_length?: number;
  has_attachments: boolean;
  attachment_count?: number;
  attachment_types?: string[];
  agent_id?: string;
}

export interface ReportMessageReceivedParams {
  conversation_id?: string;
  response_length?: number;
  round_number?: number;
  agent_id?: string;
  tools_invoked: string[];
  trace_id?: string;
  started_at?: string;
  time_to_first_token?: number;
  time_to_last_token?: number;
  model_provider?: string;
  llm_calls?: number;
  input_tokens?: number;
  output_tokens?: number;
}

export interface ReportConverseErrorParams {
  error_type: string;
  error_message: string;
  error_stack?: string;
  conversation_id?: string;
  agent_id?: string;
  connector_id?: string;
}

/**
 * Event used by Security Solution for Agent Builder-related errors.
 *
 * NOTE:
 * This intentionally shares a schema with the legacy onechat `ONECHAT_CONVERSE_ERROR` event so
 * solutions can optionally provide richer context (conversation_id/agent_id/connector_id) when
 * available, while keeping the event ID under the agent_builder prefix.
 */
export type ReportAgentBuilderErrorParams = ReportConverseErrorParams;

/**
 * Legacy onechat conversation error event payload.
 *
 * This event captures full context for errors surfaced during conversation:
 * error details (type, message, stack) plus conversation/agent/connector IDs.
 */
export type ReportOnechatConverseErrorParams = ReportConverseErrorParams;

export interface AgentBuilderTelemetryEventsMap {
  [AGENT_BUILDER_EVENT_TYPES.OptInAction]: ReportOptInActionParams;
  [AGENT_BUILDER_EVENT_TYPES.OptOut]: ReportOptOutParams;
  [AGENT_BUILDER_EVENT_TYPES.AddToChatClicked]: ReportAddToChatClickedParams;
  [AGENT_BUILDER_EVENT_TYPES.MessageSent]: ReportMessageSentParams;
  [AGENT_BUILDER_EVENT_TYPES.MessageReceived]: ReportMessageReceivedParams;
  [AGENT_BUILDER_EVENT_TYPES.AgentBuilderError]: ReportAgentBuilderErrorParams;
  [AGENT_BUILDER_EVENT_TYPES.ONECHAT_CONVERSE_ERROR]: ReportOnechatConverseErrorParams;
}

export type AgentBuilderTelemetryEvent =
  | EventTypeOpts<ReportOptInActionParams>
  | EventTypeOpts<ReportOptOutParams>
  | EventTypeOpts<ReportAddToChatClickedParams>
  | EventTypeOpts<ReportMessageSentParams>
  | EventTypeOpts<ReportMessageReceivedParams>
  | EventTypeOpts<ReportAgentBuilderErrorParams>
  | EventTypeOpts<ReportOnechatConverseErrorParams>;

// Type union of all event type strings for use in union types
export type AgentBuilderEventTypes =
  | typeof AGENT_BUILDER_EVENT_TYPES.OptInAction
  | typeof AGENT_BUILDER_EVENT_TYPES.OptOut
  | typeof AGENT_BUILDER_EVENT_TYPES.AddToChatClicked
  | typeof AGENT_BUILDER_EVENT_TYPES.MessageSent
  | typeof AGENT_BUILDER_EVENT_TYPES.MessageReceived
  | typeof AGENT_BUILDER_EVENT_TYPES.AgentBuilderError
  | typeof AGENT_BUILDER_EVENT_TYPES.ONECHAT_CONVERSE_ERROR;

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
          'Source of the opt-in action (security_settings_menu|stack_management|security_ab_tour)',
        optional: false,
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
        description: 'Source of the opt-out action (security_settings_menu|stack_management)',
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
    attachment_type: {
      type: 'keyword',
      _meta: {
        description: 'Type of attachment (alert|entity|rule|attack_discovery|other)',
        optional: true,
      },
    },
    attachment_count: {
      type: 'integer',
      _meta: {
        description: 'Number of attachments',
        optional: true,
      },
    },
  },
};

const MESSAGE_SENT_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.MessageSent,
  schema: {
    conversation_id: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: true,
      },
    },
    message_length: {
      type: 'integer',
      _meta: {
        description: 'Length of the message in characters',
        optional: true,
      },
    },
    has_attachments: {
      type: 'boolean',
      _meta: {
        description: 'Whether the message has attachments',
        optional: false,
      },
    },
    attachment_count: {
      type: 'integer',
      _meta: {
        description: 'Number of attachments',
        optional: true,
      },
    },
    attachment_types: {
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
    agent_id: {
      type: 'keyword',
      _meta: {
        description: 'ID of the agent',
        optional: true,
      },
    },
  },
};

const MESSAGE_RECEIVED_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.MessageReceived,
  schema: {
    conversation_id: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: true,
      },
    },
    response_length: {
      type: 'integer',
      _meta: {
        description: 'Length of the response in characters',
        optional: true,
      },
    },
    round_number: {
      type: 'integer',
      _meta: {
        description: 'Round number in the conversation',
        optional: true,
      },
    },
    agent_id: {
      type: 'keyword',
      _meta: {
        description: 'ID of the agent',
        optional: true,
      },
    },
    tools_invoked: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'Tool ID invoked (normalized: built-in tools keep ID, custom tools become "custom")',
        },
      },
      _meta: {
        description:
          'Tool IDs invoked in the round (normalized: built-in tools keep ID, custom tools become "custom")',
        optional: false,
      },
    },
    trace_id: {
      type: 'keyword',
      _meta: {
        description: 'Trace ID associated with this round (when tracing is enabled)',
        optional: true,
      },
    },
    started_at: {
      type: 'date',
      _meta: {
        description: 'When the round started',
        optional: true,
      },
    },
    time_to_first_token: {
      type: 'integer',
      _meta: {
        description: 'Time from round start to first token arrival, in ms',
        optional: true,
      },
    },
    time_to_last_token: {
      type: 'integer',
      _meta: {
        description: 'Time from round start to last token arrival, in ms',
        optional: true,
      },
    },
    model_provider: {
      type: 'keyword',
      _meta: {
        description: 'Connector provider (OpenAI|Google|Anthropic|Elastic)',
        optional: true,
      },
    },
    llm_calls: {
      type: 'integer',
      _meta: {
        description: 'Number of LLM calls performed during this round',
        optional: true,
      },
    },
    input_tokens: {
      type: 'integer',
      _meta: {
        description: 'Total number of input tokens sent during this round',
        optional: true,
      },
    },
    output_tokens: {
      type: 'integer',
      _meta: {
        description: 'Total number of output tokens received during this round',
        optional: true,
      },
    },
  },
};

const CONVERSE_ERROR_SCHEMA: AgentBuilderTelemetryEvent['schema'] = {
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
  error_stack: {
    type: 'text',
    _meta: {
      description: 'The error stack trace if available',
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
  agent_id: {
    type: 'keyword',
    _meta: {
      description: 'The ID of the agent involved in the conversation',
      optional: true,
    },
  },
  connector_id: {
    type: 'keyword',
    _meta: {
      description: 'The ID of the connector used for the conversation',
      optional: true,
    },
  },
};

const AGENT_BUILDER_ERROR_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.AgentBuilderError,
  schema: CONVERSE_ERROR_SCHEMA,
};

const ONECHAT_CONVERSE_ERROR_EVENT: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.ONECHAT_CONVERSE_ERROR,
  schema: CONVERSE_ERROR_SCHEMA,
};

export const agentBuilderPublicEbtEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  OPT_IN_EVENT,
  OPT_OUT_EVENT,
  ADD_TO_CHAT_CLICKED_EVENT,
  AGENT_BUILDER_ERROR_EVENT,
  ONECHAT_CONVERSE_ERROR_EVENT,
];

export const agentBuilderServerEbtEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  MESSAGE_SENT_EVENT,
  MESSAGE_RECEIVED_EVENT,
];
