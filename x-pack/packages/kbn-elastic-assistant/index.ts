/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Use any of the following 3 options to show the assistant overlay:
/** OPTION1: an icon button that shows the assistant overlay */
export { MagicButton } from './impl/magic_button';

/** OPTION2: an icon button with text that shows the assistant overlay */
export { NewChat } from './impl/new_chat';

/** OPTION3: this hook shows the assistant overlay */
export { useAssistantOverlay } from './impl/assistant/use_assistant_overlay';

// Use the following component to embed the assistant directly in a page, with no overlay:
/** this component renders the Assistant without the overlay to, for example, render it in a Timeline tab */
export { Assistant } from './impl/assistant';

// Sample content is exported with the following:
/** sample content */
export { BASE_CONVERSATIONS } from './impl/assistant/use_conversation/sample_conversations';

/** i18n translations of system prompts */
export * as SYSTEM_PROMPTS from './impl/content/prompts/system/translations';

/** i18n translations of user prompts */
export * as USER_PROMPTS from './impl/content/prompts/user/translations';

/** a helper that enriches content returned from a query with action buttons */
export { analyzeMarkdown } from './impl/assistant/use_conversation/helpers';

export type {
  /** for rendering results in a code block */
  CodeBlockDetails,
  /** the type of query that will be executed for a code block */
  QueryType,
} from './impl/assistant/use_conversation/helpers';

/** modal container for Security Assistant conversations */
export { AssistantOverlay } from './impl/assistant/assistant_overlay';

/** provides context (from the app) to the assistant */
export { AssistantProvider } from './impl/assistant_context';

/** provides configuration to the assistant */
export type { AssistantUiSettings } from './impl/assistant/helpers';

/** serialized conversations */
export type { Conversation, Message } from './impl/assistant_context/types';

export type { PromptContext } from './impl/assistant/prompt_context/types';
