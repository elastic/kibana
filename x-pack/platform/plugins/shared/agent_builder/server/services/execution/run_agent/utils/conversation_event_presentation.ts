/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateXmlTree } from '@kbn/agent-builder-genai-utils/tools/utils';
import { formatDate } from '../prompts/utils/helpers';
import type { ProcessedCustomEvent } from './context_timeline';

/**
 * Renders a custom conversation event for the LLM as a `<conversation_event>` block.
 *
 * The representation is untrusted (it is derived from an API-supplied payload), so it is
 * XML-escaped by `generateXmlTree`. The event id is deliberately not exposed: it is a
 * Kibana-internal identifier no tool consumes.
 */
export const formatConversationEvent = (event: ProcessedCustomEvent): string =>
  generateXmlTree({
    tagName: 'conversation_event',
    attributes: { type: event.type, timestamp: formatDate(event.created_at) },
    children: [event.representation.value],
  });
