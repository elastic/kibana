/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AssistantScope } from '@kbn/ai-assistant-common';
import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import { withSuspense } from '@kbn/shared-ux-utility';
import { lazy } from 'react';
import { aiAssistantCapabilities } from '../common/capabilities';
import { registerTelemetryEventTypes } from './analytics';
import { ObservabilityAIAssistantChatServiceContext } from './context/observability_ai_assistant_chat_service_context';
import { ObservabilityAIAssistantMultipaneFlyoutContext } from './context/observability_ai_assistant_multipane_flyout_context';
import { createUseChat } from './hooks/use_chat';
import { useGenAIConnectorsWithoutContext } from './hooks/use_genai_connectors';
import { useObservabilityAIAssistantChatService } from './hooks/use_observability_ai_assistant_chat_service';
import { createService } from './service/create_service';
import type {
  ConfigSchema,
  ObservabilityAIAssistantPluginSetupDependencies,
  ObservabilityAIAssistantPluginStartDependencies,
  ObservabilityAIAssistantPublicSetup,
  ObservabilityAIAssistantPublicStart,
  ObservabilityAIAssistantService,
} from './types';
import { createScreenContextAction } from './utils/create_screen_context_action';
import { createWithProviders } from './utils/create_with_providers';
import { getContextualInsightMessages } from './utils/get_contextual_insight_messages';

export class ObservabilityAIAssistantPlugin
  implements
    Plugin<
      ObservabilityAIAssistantPublicSetup,
      ObservabilityAIAssistantPublicStart,
      ObservabilityAIAssistantPluginSetupDependencies,
      ObservabilityAIAssistantPluginStartDependencies
    >
{
  logger: Logger;
  service?: ObservabilityAIAssistantService;
  scopeFromConfig?: AssistantScope;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
    this.scopeFromConfig = context.config.get().scope;
  }
  setup(
    coreSetup: CoreSetup,
    pluginsSetup: ObservabilityAIAssistantPluginSetupDependencies
  ): ObservabilityAIAssistantPublicSetup {
    registerTelemetryEventTypes(coreSetup.analytics);
    return {};
  }

  start(
    coreStart: CoreStart,
    pluginsStart: ObservabilityAIAssistantPluginStartDependencies
  ): ObservabilityAIAssistantPublicStart {
    const service = (this.service = createService({
      analytics: coreStart.analytics,
      coreStart,
      enabled:
        coreStart.application.capabilities.observabilityAIAssistant[
          aiAssistantCapabilities.show
        ] === true,
      scopes: this.scopeFromConfig ? [this.scopeFromConfig] : ['all'],
      scopeIsMutable: !!this.scopeFromConfig,
    }));

    const services = {
      ...coreStart,
      plugins: {
        start: pluginsStart,
      },
    };

    const withProviders = createWithProviders({ service, kibanaContextServices: services });

    const isEnabled = service.isEnabled();

    return {
      service,
      useGenAIConnectors: () => useGenAIConnectorsWithoutContext(service),
      useChat: createUseChat({
        notifications: coreStart.notifications,
      }),
      ObservabilityAIAssistantMultipaneFlyoutContext,
      ObservabilityAIAssistantChatServiceContext,
      useObservabilityAIAssistantChatService,
      ObservabilityAIAssistantContextualInsight: isEnabled
        ? withSuspense(
            withProviders(
              lazy(() =>
                import('./components/insight/insight').then((m) => ({ default: m.Insight }))
              )
            )
          )
        : null,
      getContextualInsightMessages,
      createScreenContextAction,
    };
  }
}
