/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// To integrate the assistant into a Kibana app, perform the following three steps:

// Step 1: Wrap your Kibana app in the `AssistantProvider` component. This typically
// happens in the root of your app. Optionally provide a custom title for the assistant:

/** provides context (from the app) to the assistant, and injects Kibana services, like `http` */
export { AssistantProvider, useAssistantContext } from './impl/assistant_context';

// Step 2.1: Add the `AssistantOverlay` component to your app. This component displays the assistant
// overlay in a modal, bound to a shortcut key:

/** modal overlay for Elastic Assistant conversations */
export { AssistantOverlay } from './impl/assistant/assistant_overlay';

// In addition to the `AssistantOverlay`, or as an alternative, you may use the `Assistant` component
// to display the assistant without the modal overlay:

/** this component renders the Assistant without the modal overlay to, for example, render it in a Timeline tab */
export { Assistant } from './impl/assistant';

// Step 2.2: Provide spaceId to `AssistantSpaceIdProvider`
// The spaceId here will be used to fetch the assistant data from localstorage.
// So make sure not to provide null, undefined, or any fallback spaceId.
// Only render the `AssistantSpaceIdProvider` component when the spaceId is available.
export {
  AssistantSpaceIdProvider,
  useAssistantLastConversation,
} from './impl/assistant/use_space_aware_context';

// Step 3: Wherever you want to bring context into the assistant, use the any combination of the following
// components and hooks:
// - `NewChat` component
// - `NewChatByTitle` component
// - `useAssistantOverlay` hook

/**
 * `NewChat` displays a _New chat_ icon button, providing all the context
 * necessary to start a new chat. You may optionally style the button icon,
 * or override the default _New chat_ text with custom content, like `🪄✨`
 *
 * USE THIS WHEN: All the data necessary to start a new chat is available
 * in the same part of the React tree as the _New chat_ button.
 */
export { NewChat } from './impl/new_chat';

/**
 * `NewChatByTitle` displays a _New chat_ icon button by providing only the `promptContextId`
 * of a context that was (already) registered by the `useAssistantOverlay` hook. You may
 * optionally style the button icon, or override the default _New chat_ text with custom
 * content, like {'🪄✨'}
 *
 * USE THIS WHEN: all the data necessary to start a new chat is NOT available
 * in the same part of the React tree as the _New chat_ button. When paired
 * with the `useAssistantOverlay` hook, this option enables context to be be
 * registered where the data is available, and then the _New chat_ button can be displayed
 * in another part of the tree.
 */
export { NewChatByTitle } from './impl/new_chat_by_title';

/**
 * `useAssistantOverlay` is a hook that registers context with the assistant overlay, and
 * returns an optional `showAssistantOverlay` function to display the assistant overlay.
 * As an alterative to using the `showAssistantOverlay` returned from this hook, you may
 * use the `NewChatByTitle` component and pass it the `promptContextId` returned by this hook.
 *
 * USE THIS WHEN: You want to register context in one part of the tree, and then show
 * a _New chat_ button in another part of the tree without passing around the data, or when
 * you want to build a custom `New chat` button with features not not provided by the
 * `NewChat` component.
 */
export { useAssistantOverlay } from './impl/assistant/use_assistant_overlay';

/** a helper that enriches content returned from a query with action buttons */
export { analyzeMarkdown } from './impl/assistant/use_conversation/helpers';

export { ConnectorSelectorInline } from './impl/connectorland/connector_selector_inline/connector_selector_inline';

export {
  /** The Attack discovery local storage key */
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  /** The default maximum number of alerts to be sent as context when generating Attack discoveries */
  DEFAULT_ATTACK_DISCOVERY_MAX_ALERTS,
  DEFAULT_LATEST_ALERTS,
  DEFEND_INSIGHTS_STORAGE_KEY,
  /** The end of the date range of alerts, sent as context to the LLM */
  END_LOCAL_STORAGE_KEY,
  /** Search bar filters that apply to the alerts sent as context to the LLM */
  FILTERS_LOCAL_STORAGE_KEY,
  KNOWLEDGE_BASE_LOCAL_STORAGE_KEY,
  /** The local storage key that specifies the maximum number of alerts to send as context */
  MAX_ALERTS_LOCAL_STORAGE_KEY,
  /** The history view's end of the date range of attack discoveries */
  HISTORY_END_LOCAL_STORAGE_KEY,
  /** The history view's Search bar query that apply to the alerts sent as context to the LLM */
  HISTORY_QUERY_LOCAL_STORAGE_KEY,
  /** The history view's start date range of attack discoveries */
  HISTORY_START_LOCAL_STORAGE_KEY,
  /** Search bar query that apply to the alerts sent as context to the LLM */
  QUERY_LOCAL_STORAGE_KEY,
  /** The local storage key that specifies whether the settings tour should be shown */
  SHOW_SETTINGS_TOUR_LOCAL_STORAGE_KEY,
  /** The start of the date range of alerts, sent as context to the LLM */
  START_LOCAL_STORAGE_KEY,
  /** The local storage key that controls visibility of the callout about moving Attack discovery to Attacks page */
  MOVING_ATTACKS_CALLOUT_LOCAL_STORAGE_KEY,
} from './impl/assistant_context/constants';

export type { AIConnector } from './impl/connectorland/connector_selector';
export { useLoadConnectors } from './impl/connectorland/use_load_connectors';

export type {
  /** for rendering results in a code block */
  CodeBlockDetails,
  /** the type of query that will be executed for a code block */
  QueryType,
} from './impl/assistant/use_conversation/helpers';

export type {
  /** Feature Availability Interface */
  AssistantAvailability,
  /** Telemetry Interface */
  AssistantTelemetry,
  /** Conversation Interface */
  Conversation,
  /** Message interface on the client */
  ClientMessage,
  /** Function type to return messages UI */
  GetAssistantMessages,
} from './impl/assistant_context/types';

/**
 * This interface is used to pass context to the assistant,
 * for the purpose of building prompts. Examples of context include:
 * - a single alert
 * - multiple alerts
 * - a single event
 * - multiple events
 * - markdown
 * - csv
 * - anything else that the LLM can interpret
 */
export type { PromptContext } from './impl/assistant/prompt_context/types';

/**
 * This interface is used to pass a default or base set of contexts to the Elastic Assistant when
 * initializing it. This is used to provide 'category' options when users create Quick Prompts.
 * Also, useful for collating all of a solutions' prompts in one place.
 *
 * e.g. see Security Solution's x-pack/solutions/security/plugins/security_solution/public/assistant/prompt_contexts/index.tsx
 */
export type { PromptContextTemplate } from './impl/assistant/prompt_context/types';

export { useFetchCurrentUserConversations } from './impl/assistant/api/conversations/use_fetch_current_user_conversations';
export * from './impl/assistant/api/conversations/bulk_update_actions_conversations';
export { getConversationById } from './impl/assistant/api/conversations/conversations';

export { UpgradeButtons } from './impl/upgrade/upgrade_buttons';
export { getUserConversationsExist, bulkUpdatePrompts } from './impl/assistant/api';

export {
  /** A range slider component, typically used to configure the number of alerts sent as context */
  AlertsRange,
  /** This event occurs when the `AlertsRange` slider is changed */
  type SingleRangeChangeEvent,
} from './impl/knowledge_base/alerts_range';
export {
  /** A label instructing the user to send fewer alerts */
  SELECT_FEWER_ALERTS,
  /** Your anonymization settings will apply to these alerts (label) */
  YOUR_ANONYMIZATION_SETTINGS,
} from './impl/knowledge_base/translations';
export { SearchAILakeConfigurationsSettingsManagement } from './impl/assistant/settings/search_ai_lake_configurations_settings_management';
export { CONVERSATIONS_TAB } from './impl/assistant/settings/const';
export type { ManagementSettingsTabs } from './impl/assistant/settings/types';

export { getNewSelectedPromptContext } from './impl/data_anonymization/get_new_selected_prompt_context';
export { getCombinedMessage } from './impl/assistant/prompt/helpers';
export { useChatComplete } from './impl/assistant/api/chat_complete/use_chat_complete';
export { useFetchAnonymizationFields } from './impl/assistant/api/anonymization_fields/use_fetch_anonymization_fields';

export { useFindPrompts } from './impl/assistant/api/security_ai_prompts/use_find_prompts';

export interface UseAssistantAvailability {
  // True when searchAiLake configurations is available
  hasSearchAILakeConfigurations: boolean;
  // True when user is Enterprise. When false, the Assistant is disabled and unavailable
  isAssistantEnabled: boolean;
  // True when the Assistant is visible, i.e. the Assistant is available and the Assistant is visible in the UI
  isAssistantVisible: boolean;
  // When true, user has `All` privilege for `Management > AI Assistant`
  isAssistantManagementEnabled: boolean;
  // When true, the Assistant is hidden and unavailable
  hasAssistantPrivilege: boolean;
  // When true, user has `All` privilege for `Connectors and Actions` (show/execute/delete/save ui capabilities)
  hasConnectorsAllPrivilege: boolean;
  // When true, user has `Read` privilege for `Connectors and Actions` (show/execute ui capabilities)
  hasConnectorsReadPrivilege: boolean;
  // When true, user has `Edit` privilege for `AnonymizationFields`
  hasUpdateAIAssistantAnonymization: boolean;
  // When true, user has `Edit` privilege for `Global Knowledge Base`
  hasManageGlobalKnowledgeBase: boolean;
  // When true, user has privilege to access Agent Builder feature
  hasAgentBuilderPrivilege?: boolean;
  // When true, use has privilege to manage Agent Builder feature
  hasAgentBuilderManagePrivilege?: boolean;
}
