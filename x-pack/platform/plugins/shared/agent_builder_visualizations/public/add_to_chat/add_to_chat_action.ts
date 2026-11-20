/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { merge, type Observable } from 'rxjs';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_EVENT_TYPES } from '@kbn/agent-builder-common';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { AnalyticsServiceStart } from '@kbn/core/public';
import { ADD_TO_CHAT_ACTION_ID } from '@kbn/embeddable-plugin/public';
import type { EmbeddableApiContext } from '@kbn/presentation-publishing';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import type { AddToChatProvider, AddToChatProviderRegistry } from './types';

export interface AddToChatActionDeps {
  agentBuilder: Pick<AgentBuilderPluginStart, 'getAgentBuilderAccess'>;
  analytics: AnalyticsServiceStart;
  providers: Pick<AddToChatProviderRegistry, 'getAll'>;
}

const findProvider = async (
  providers: readonly AddToChatProvider[],
  embeddable: unknown
): Promise<AddToChatProvider | undefined> => {
  for (const provider of providers) {
    if (await provider.isCompatible(embeddable)) {
      return provider;
    }
  }
  return undefined;
};

const reportClicked = (
  analytics: AnalyticsServiceStart,
  pathway: string,
  attachmentTypes: readonly string[]
): void => {
  try {
    analytics.reportEvent(AGENT_BUILDER_EVENT_TYPES.AddToChatClicked, {
      pathway,
      attachments: [...attachmentTypes],
    });
  } catch {
    // never break the action on telemetry errors
  }
};

/**
 * The "Add to chat" panel action. It is offered when agent builder is usable and a registered
 * provider handles the panel; that provider decides what reaches the chat.
 */
export const createAddToChatAction = ({
  agentBuilder,
  analytics,
  providers,
}: AddToChatActionDeps): ActionDefinition<EmbeddableApiContext> => {
  const getProvider = async (embeddable: unknown): Promise<AddToChatProvider | undefined> => {
    const provider = await findProvider(providers.getAll(), embeddable);
    if (!provider) {
      return undefined;
    }
    const access = await agentBuilder.getAgentBuilderAccess();
    return access.hasRequiredLicense && access.hasLlmConnector ? provider : undefined;
  };

  return {
    id: ADD_TO_CHAT_ACTION_ID,
    type: ADD_TO_CHAT_ACTION_ID,
    order: 25,
    getDisplayName: () =>
      i18n.translate('xpack.agentBuilder.visualizations.addToChat.displayName', {
        defaultMessage: 'Add to chat',
      }),
    getIconType: () => 'addToChat',
    isCompatible: async ({ embeddable }) => Boolean(await getProvider(embeddable)),
    getCompatibilityChangesSubject: ({ embeddable }): Observable<undefined> | undefined => {
      const subjects = providers
        .getAll()
        .map((provider) => provider.getCompatibilityChangesSubject?.(embeddable))
        .filter((subject): subject is Observable<undefined> => Boolean(subject));
      return subjects.length ? merge(...subjects) : undefined;
    },
    execute: async ({ embeddable }) => {
      const provider = await getProvider(embeddable);
      if (!provider) {
        return;
      }
      const result = await provider.execute(embeddable);
      if (result) {
        reportClicked(analytics, provider.id, result.attachmentTypes);
      }
    },
  };
};
