/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { filter, type Subscription } from 'rxjs';
import { isRoundCompleteEvent } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { IdGenerator } from '..';

interface NewAttachmentIdRegenerationSubscriptionParams {
  agentBuilder: AgentBuilderPluginStart;
  draftAttachmentId: IdGenerator;
}

// Keep one stable id for the current draft attachment, then rotate it once that draft
// has been created in the conversation so future edits do not target the existing attachment
export const createNewAttachmentIdRegenerationSubscription = ({
  agentBuilder,
  draftAttachmentId,
}: NewAttachmentIdRegenerationSubscriptionParams): Subscription =>
  agentBuilder.events.chat$.pipe(filter(isRoundCompleteEvent)).subscribe((event) => {
    if (event.data.attachments?.some(({ id }) => id === draftAttachmentId.current)) {
      draftAttachmentId.next();
    }
  });
