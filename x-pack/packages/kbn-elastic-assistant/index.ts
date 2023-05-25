/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  /** for rendering results in a code block */
  CodeBlockDetails,
  /** the type of query that will be executed for a code block */
  QueryType,
} from './impl/assistant/use_conversation/helpers';

/** sample content */
export { BASE_CONVERSATIONS } from './impl/assistant/use_conversation/sample_conversations';

/** a helper that enriches content returned from a query with action buttons */
export { analyzeMarkdown } from './impl/assistant/use_conversation/helpers';

/** this component renders the Assistant without the overlay to, for example, render it in a Timeline tab */
export { Assistant } from './impl/assistant';

/** modal container for Security Assistant conversations */
export { AssistantOverlay } from './impl/assistant/assistant_overlay';

/** provides context (from the app) to the assistant */
export { AssistantProvider } from './impl/assistant_context';

/** provides configuration to the assistant */
export type { AssistantUiSettings } from './impl/assistant/helpers';

/** serialized conversations */
export type { Conversation, Message } from './impl/assistant_context/types';

/** generates unique IDs for contexts provided to the assistant */
export { getUniquePromptContextId } from './impl/assistant_context/helpers';

export type { PromptContext } from './impl/assistant/prompt_context/types';

/** i18n translations of system prompts */
export * as SYSTEM_PROMPTS from './impl/content/prompts/system/translations';

/** this hook shows the assistant overlay */
export { useAssistantOverlay } from './impl/assistant/use_assistant_overlay';

/** i18n translations of user prompts */
export * as USER_PROMPTS from './impl/content/prompts/user/translations';

/**
 * this hook registers a prompt context with the assistant, and automatically
 * unregisters it when the component unmounts
 */
export { useAssistantContextRegistry } from './impl/use_assistant_context_registry';
