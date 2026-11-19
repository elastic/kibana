/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, lazy } from 'react';
import { EuiSkeletonText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { ConversationEventUIDefinition } from '@kbn/agent-builder-browser';
import { TEXT_NOTE_EVENT_TYPE } from '../../common/conversation_events/constants';
import type { TextNoteEventData } from '../../common/conversation_events/text_note';

// Loaded on first render, not at plugin start — keeps EUI panel/text/title out of
// the startup bundle.
const TextNoteRenderer = lazy(() =>
  import('./text_note_renderer').then((m) => ({ default: m.TextNoteRenderer }))
);

export const textNoteEventUiDefinition: ConversationEventUIDefinition<
  typeof TEXT_NOTE_EVENT_TYPE,
  TextNoteEventData
> = {
  type: TEXT_NOTE_EVENT_TYPE,
  render: (event) => (
    <Suspense fallback={<EuiSkeletonText lines={2} />}>
      <TextNoteRenderer data={event.data} />
    </Suspense>
  ),
  getHeader: () => ({
    icon: 'document',
    iconTitle: i18n.translate(
      'xpack.agentBuilderPlatform.conversationEvents.textNote.icon.ariaLabel',
      {
        defaultMessage: 'Text note type',
      }
    ),
    label: i18n.translate('xpack.agentBuilderPlatform.conversationEvents.textNote.label', {
      defaultMessage: 'Text Note',
    }),
  }),
};
