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

// Step 2: Add the `AssistantOverlay` component to your app. This component displays the assistant
// overlay in a modal, bound to a shortcut key:

/** modal overlay for Elastic Assistant conversations */
export { AssistantOverlay } from './impl/assistant/assistant_overlay';

// In addition to the `AssistantOverlay`, or as an alternative, you may use the `Assistant` component
// to display the assistant without the modal overlay:

/** this component renders the Assistant without the modal overlay to, for example, render it in a Timeline tab */
export { Assistant } from './impl/assistant';

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

/** Default Elastic AI Assistant logo, can be removed once included in EUI **/
export { AssistantAvatar } from './impl/assistant/assistant_avatar/assistant_avatar';

export { ConnectorSelectorInline } from './impl/connectorland/connector_selector_inline/connector_selector_inline';

export {
  ATTACK_DISCOVERY_STORAGE_KEY,
  DEFAULT_ASSISTANT_NAMESPACE,
  DEFAULT_LATEST_ALERTS,
  KNOWLEDGE_BASE_LOCAL_STORAGE_KEY,
} from './impl/assistant_context/constants';

export { useLoadConnectors } from './impl/connectorland/use_load_connectors';

export {
  ELASTIC_AI_ASSISTANT_TITLE,
  WELCOME_CONVERSATION_TITLE,
} from './impl/assistant/use_conversation/translations';

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
 * e.g. see Security Solution's x-pack/plugins/security_solution/public/assistant/prompt_contexts/index.tsx
 */
export type { PromptContextTemplate } from './impl/assistant/prompt_context/types';

export { useFetchCurrentUserConversations } from './impl/assistant/api/conversations/use_fetch_current_user_conversations';
export * from './impl/assistant/api/conversations/bulk_update_actions_conversations';
export { getConversationById } from './impl/assistant/api/conversations/conversations';

export { mergeBaseWithPersistedConversations } from './impl/assistant/helpers';

export { UpgradeButtons } from './impl/upgrade/upgrade_buttons';
export { getUserConversations, getPrompts, bulkUpdatePrompts } from './impl/assistant/api';
