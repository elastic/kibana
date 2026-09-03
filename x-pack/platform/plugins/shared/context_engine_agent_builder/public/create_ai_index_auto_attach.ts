/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { ContextEnginePluginStart } from '@kbn/context-engine-plugin/public/types';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import { toAiIndexAttachment } from './create_suggest_automation_provider';

/**
 * Keeps an already-open assistant pointed at the AI index the user is looking at.
 *
 * The "Help me set this up" and "Suggest automation" buttons attach the index as they open the
 * chat, but a user who opened the assistant first would otherwise have to describe the page they
 * are on. This mirrors the page into the open conversation instead, and withdraws the attachment
 * when they navigate away.
 */
export const createAiIndexAutoAttach = ({
  agentBuilder,
  contextEngine,
}: {
  agentBuilder: AgentBuilderPluginStart | undefined;
  contextEngine: ContextEnginePluginStart;
}): (() => void) => {
  if (!agentBuilder?.addAttachment) {
    return () => {};
  }

  const { addAttachment, removeAttachment, events } = agentBuilder;
  let attachedAiIndexId: string | undefined;
  let pendingAttach: ReturnType<typeof setTimeout> | undefined;

  const subscription = combineLatest([
    contextEngine.viewedAiIndex$,
    // `null` means no chat surface is mounted at all, so there is nothing to attach to.
    events.ui.activeConversation$.pipe(
      map((conversation) => conversation !== null),
      distinctUntilChanged()
    ),
  ]).subscribe(([aiIndex, isChatOpen]) => {
    if (pendingAttach !== undefined) {
      clearTimeout(pendingAttach);
      pendingAttach = undefined;
    }

    const nextAiIndexId = isChatOpen ? aiIndex?.id : undefined;

    if (attachedAiIndexId !== undefined && attachedAiIndexId !== nextAiIndexId) {
      removeAttachment(attachedAiIndexId);
      attachedAiIndexId = undefined;
    }

    if (!aiIndex || !isChatOpen) {
      return;
    }

    // The sidebar registers the callbacks that back `addAttachment` while it renders, so an
    // attachment pushed in the same tick as the conversation becoming active is dropped.
    pendingAttach = setTimeout(() => {
      pendingAttach = undefined;
      attachedAiIndexId = aiIndex.id;
      addAttachment(toAiIndexAttachment(aiIndex));
    });
  });

  return () => {
    if (pendingAttach !== undefined) {
      clearTimeout(pendingAttach);
    }
    subscription.unsubscribe();
  };
};
