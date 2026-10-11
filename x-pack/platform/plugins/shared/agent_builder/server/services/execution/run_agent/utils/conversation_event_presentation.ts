/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAttachmentEvent } from '@kbn/agent-builder-common';
import { generateXmlTree } from '@kbn/agent-builder-genai-utils/tools/utils';
import { formatDate } from '../prompts/utils/helpers';
import { formatAttachmentEvent } from './attachment_event_presentation';
import type { ProcessedStandaloneEvent } from './context_timeline';

/**
 * Renders a custom conversation event for the LLM as a `<conversation_event>` block.
 *
 * The representation is untrusted (it is derived from an API-supplied payload), so it is
 * XML-escaped by `generateXmlTree`. The event id is deliberately not exposed: it is a
 * Kibana-internal identifier no tool consumes. An attachment event is rendered from its data by
 * `formatAttachmentEvent`, which emits the complete block unescaped: its representation is ignored.
 */
export const formatConversationEvent = (event: ProcessedStandaloneEvent): string =>
  isAttachmentEvent(event)
    ? formatAttachmentEvent(event)
    : generateXmlTree({
        tagName: 'conversation_event',
        attributes: { type: event.type, timestamp: formatDate(event.created_at) },
        children: [event.representation.value],
      });
