/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AnalyticsServiceSetup, EventTypeOpts } from '@kbn/core/public';

/**
 * Event type constants for Agent Builder telemetry events.
 */
const TELEMETRY_PREFIX = 'Agent Builder';
export const AGENT_BUILDER_EVENT_TYPES = {
  OptInStepReached: `${TELEMETRY_PREFIX} Opt-In Step Reached`,
  OptInConfirmationShown: `${TELEMETRY_PREFIX} Opt-In Confirmation Shown`,
  OptInConfirmed: `${TELEMETRY_PREFIX} Opt-In Confirmed`,
  OptInCancelled: `${TELEMETRY_PREFIX} Opt-In Cancelled`,
  OptOut: `${TELEMETRY_PREFIX} Opt-Out`,
  AddToChatClicked: `${TELEMETRY_PREFIX} Add to Chat Clicked`,
  MessageSent: `${TELEMETRY_PREFIX} Message Sent`,
  MessageReceived: `${TELEMETRY_PREFIX} Message Received`,
  AgentBuilderError: `${TELEMETRY_PREFIX} Error`,
} as const;

export type OptInSource = 'security_settings_menu' | 'stack_management' | 'security_ab_tour';
export type OptInStep = 'initial' | 'confirmation_modal' | 'final';
export type AttachmentType = 'alert' | 'entity' | 'rule' | 'attack_discovery' | 'other';
export type Pathway =
  | 'alerts_flyout'
  | 'entity_flyout'
  | 'rules_table'
  | 'rule_creation'
  | 'attack_discovery'
  | 'other';
export type ErrorContext = 'opt_in' | 'message_send' | 'tool_execution' | 'invocation' | 'other';

export interface ReportOptInStepReachedParams {
  step: OptInStep;
  source: OptInSource;
}

export interface ReportOptInConfirmationShownParams {
  source: OptInSource;
}

export interface ReportOptInConfirmedParams {
  source: OptInSource;
}

export interface ReportOptInCancelledParams {
  source: OptInSource;
  step: OptInStep;
}

export interface ReportOptOutParams {
  source: 'security_settings_menu' | 'stack_management';
}

export interface ReportAddToChatClickedParams {
  pathway: Pathway;
  attachmentType?: AttachmentType;
  attachmentCount?: number;
}

export interface ReportMessageSentParams {
  conversationId: string;
  messageLength?: number;
  hasAttachments: boolean;
  attachmentCount?: number;
  attachmentTypes?: string[];
  agentId?: string;
}

export interface ReportMessageReceivedParams {
  conversationId: string;
  responseLength?: number;
  roundNumber?: number;
  agentId?: string;
  toolsUsed?: string[];
  toolCount?: number;
  toolsInvoked?: string[];
}

export interface ReportAgentBuilderErrorParams {
  errorType: string;
  errorMessage?: string;
  context?: ErrorContext;
  conversationId?: string;
  agentId?: string;
  pathway?: string;
}

export interface AgentBuilderTelemetryEventsMap {
  [AGENT_BUILDER_EVENT_TYPES.OptInStepReached]: ReportOptInStepReachedParams;
  [AGENT_BUILDER_EVENT_TYPES.OptInConfirmationShown]: ReportOptInConfirmationShownParams;
  [AGENT_BUILDER_EVENT_TYPES.OptInConfirmed]: ReportOptInConfirmedParams;
  [AGENT_BUILDER_EVENT_TYPES.OptInCancelled]: ReportOptInCancelledParams;
  [AGENT_BUILDER_EVENT_TYPES.OptOut]: ReportOptOutParams;
  [AGENT_BUILDER_EVENT_TYPES.AddToChatClicked]: ReportAddToChatClickedParams;
  [AGENT_BUILDER_EVENT_TYPES.MessageSent]: ReportMessageSentParams;
  [AGENT_BUILDER_EVENT_TYPES.MessageReceived]: ReportMessageReceivedParams;
  [AGENT_BUILDER_EVENT_TYPES.AgentBuilderError]: ReportAgentBuilderErrorParams;
}

export type AgentBuilderTelemetryEvent =
  | EventTypeOpts<ReportOptInStepReachedParams>
  | EventTypeOpts<ReportOptInConfirmationShownParams>
  | EventTypeOpts<ReportOptInConfirmedParams>
  | EventTypeOpts<ReportOptInCancelledParams>
  | EventTypeOpts<ReportOptOutParams>
  | EventTypeOpts<ReportAddToChatClickedParams>
  | EventTypeOpts<ReportMessageSentParams>
  | EventTypeOpts<ReportMessageReceivedParams>
  | EventTypeOpts<ReportAgentBuilderErrorParams>;

// Type union of all event type strings for use in union types
export type AgentBuilderEventTypes =
  | typeof AGENT_BUILDER_EVENT_TYPES.OptInStepReached
  | typeof AGENT_BUILDER_EVENT_TYPES.OptInConfirmationShown
  | typeof AGENT_BUILDER_EVENT_TYPES.OptInConfirmed
  | typeof AGENT_BUILDER_EVENT_TYPES.OptInCancelled
  | typeof AGENT_BUILDER_EVENT_TYPES.OptOut
  | typeof AGENT_BUILDER_EVENT_TYPES.AddToChatClicked
  | typeof AGENT_BUILDER_EVENT_TYPES.MessageSent
  | typeof AGENT_BUILDER_EVENT_TYPES.MessageReceived
  | typeof AGENT_BUILDER_EVENT_TYPES.AgentBuilderError;

const optInStepReachedEvent: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.OptInStepReached,
  schema: {
    step: {
      type: 'keyword',
      _meta: {
        description: 'Step in the opt-in flow (initial|confirmation_modal|final)',
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

const optInConfirmationShownEvent: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.OptInConfirmationShown,
  schema: {
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

const optInConfirmedEvent: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.OptInConfirmed,
  schema: {
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

const optInCancelledEvent: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.OptInCancelled,
  schema: {
    source: {
      type: 'keyword',
      _meta: {
        description:
          'Source of the opt-in action (security_settings_menu|stack_management|security_ab_tour)',
        optional: false,
      },
    },
    step: {
      type: 'keyword',
      _meta: {
        description: 'Step where cancellation occurred (initial|confirmation_modal|final)',
        optional: false,
      },
    },
  },
};

const optOutEvent: AgentBuilderTelemetryEvent = {
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

const addToChatClickedEvent: AgentBuilderTelemetryEvent = {
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
    attachmentType: {
      type: 'keyword',
      _meta: {
        description: 'Type of attachment (alert|entity|rule|attack_discovery|other)',
        optional: true,
      },
    },
    attachmentCount: {
      type: 'integer',
      _meta: {
        description: 'Number of attachments',
        optional: true,
      },
    },
  },
};

const messageSentEvent: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.MessageSent,
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: false,
      },
    },
    messageLength: {
      type: 'integer',
      _meta: {
        description: 'Length of the message in characters',
        optional: true,
      },
    },
    hasAttachments: {
      type: 'boolean',
      _meta: {
        description: 'Whether the message has attachments',
        optional: false,
      },
    },
    attachmentCount: {
      type: 'integer',
      _meta: {
        description: 'Number of attachments',
        optional: true,
      },
    },
    attachmentTypes: {
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
    agentId: {
      type: 'keyword',
      _meta: {
        description: 'ID of the agent',
        optional: true,
      },
    },
  },
};

const messageReceivedEvent: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.MessageReceived,
  schema: {
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID',
        optional: false,
      },
    },
    responseLength: {
      type: 'integer',
      _meta: {
        description: 'Length of the response in characters',
        optional: true,
      },
    },
    roundNumber: {
      type: 'integer',
      _meta: {
        description: 'Round number in the conversation',
        optional: true,
      },
    },
    agentId: {
      type: 'keyword',
      _meta: {
        description: 'ID of the agent',
        optional: true,
      },
    },
    toolsUsed: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description: 'Name of tool used',
        },
      },
      _meta: {
        description: 'Names of tools used in the response',
        optional: true,
      },
    },
    toolCount: {
      type: 'integer',
      _meta: {
        description: 'Number of tools used',
        optional: true,
      },
    },
    toolsInvoked: {
      type: 'array',
      items: {
        type: 'keyword',
        _meta: {
          description:
            'Tool ID invoked (normalized: built-in tools keep ID, custom tools become "Custom")',
        },
      },
      _meta: {
        description:
          'Tool IDs invoked in the round (normalized: built-in tools keep ID, custom tools become "Custom")',
        optional: true,
      },
    },
  },
};

const agentBuilderErrorEvent: AgentBuilderTelemetryEvent = {
  eventType: AGENT_BUILDER_EVENT_TYPES.AgentBuilderError,
  schema: {
    errorType: {
      type: 'keyword',
      _meta: {
        description:
          'Type of error (e.g., network_error, tool_execution_error, message_send_error, opt_in_error)',
        optional: false,
      },
    },
    errorMessage: {
      type: 'text',
      _meta: {
        description: 'Error message',
        optional: true,
      },
    },
    context: {
      type: 'keyword',
      _meta: {
        description:
          'Context where error occurred (opt_in|message_send|tool_execution|invocation|other)',
        optional: true,
      },
    },
    conversationId: {
      type: 'keyword',
      _meta: {
        description: 'Conversation ID if applicable',
        optional: true,
      },
    },
    agentId: {
      type: 'keyword',
      _meta: {
        description: 'Agent ID if applicable',
        optional: true,
      },
    },
    pathway: {
      type: 'keyword',
      _meta: {
        description: 'Pathway where error occurred',
        optional: true,
      },
    },
  },
};

export const agentBuilderTelemetryEvents: Array<EventTypeOpts<Record<string, unknown>>> = [
  optInStepReachedEvent,
  optInConfirmationShownEvent,
  optInConfirmedEvent,
  optInCancelledEvent,
  optOutEvent,
  addToChatClickedEvent,
  messageSentEvent,
  messageReceivedEvent,
  agentBuilderErrorEvent,
];

/**
 * Registers Agent Builder telemetry events with the analytics service.
 */
export const registerAgentBuilderTelemetryEvents = (analytics: AnalyticsServiceSetup) => {
  agentBuilderTelemetryEvents.forEach((eventConfig) => {
    analytics.registerEventType(eventConfig);
  });
};
