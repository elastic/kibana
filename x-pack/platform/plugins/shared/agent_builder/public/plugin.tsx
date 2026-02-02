/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/public';
import type { Logger } from '@kbn/logging';
import React from 'react';
import ReactDOM from 'react-dom';
import { registerLocators } from './locator/register_locators';
import { registerAnalytics, registerApp } from './register';
import { AgentBuilderNavControlInitiator } from './components/nav_control/lazy_agent_builder_nav_control';
import {
  AgentBuilderAccessChecker,
  AgentService,
  AttachmentsService,
  ChatService,
  ConversationsService,
  DocLinksService,
  NavigationService,
  ToolsService,
  EventsService,
  type AgentBuilderInternalService,
} from './services';
import { createPublicAttachmentContract } from './services/attachments';
import { createPublicToolContract } from './services/tools';
import { createPublicAgentsContract } from './services/agents';
import { createPublicEventsContract } from './services/events';
import { registerWorkflowSteps } from './step_types';
import type {
  ConfigSchema,
  AgentBuilderPluginSetup,
  AgentBuilderPluginStart,
  AgentBuilderSetupDependencies,
  AgentBuilderStartDependencies,
  ConversationFlyoutRef,
} from './types';
import { openConversationFlyout } from './flyout/open_conversation_flyout';
import type { EmbeddableConversationProps } from './embeddable/types';
import type { OpenConversationFlyoutOptions } from './flyout/types';

export class AgentBuilderPlugin
  implements
    Plugin<
      AgentBuilderPluginSetup,
      AgentBuilderPluginStart,
      AgentBuilderSetupDependencies,
      AgentBuilderStartDependencies
    >
{
  logger: Logger;
  private conversationFlyoutActiveConfig: EmbeddableConversationProps = {};
  private internalServices?: AgentBuilderInternalService;
  private setupServices?: {
    navigationService: NavigationService;
  };
  private activeFlyoutRef: ConversationFlyoutRef | null = null;
  private flyoutCallbacks: {
    updateProps: (props: EmbeddableConversationProps) => void;
    resetBrowserApiTools: () => void;
  } | null = null;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    core: CoreSetup<AgentBuilderStartDependencies, AgentBuilderPluginStart>,
    deps: AgentBuilderSetupDependencies
  ): AgentBuilderPluginSetup {
    const navigationService = new NavigationService({
      management: deps.management.locator,
      licenseManagement: deps.licenseManagement?.locator,
    });

    this.setupServices = { navigationService };

    registerApp({
      core,
      getServices: () => {
        if (!this.internalServices) {
          throw new Error('getServices called before plugin start');
        }
        return this.internalServices;
      },
    });

    registerAnalytics({ analytics: core.analytics });
    registerLocators(deps.share);

    registerWorkflowSteps(deps.workflowsExtensions);

    return {};
  }

  start(
    core: CoreStart,
    startDependencies: AgentBuilderStartDependencies
  ): AgentBuilderPluginStart {
    const { http } = core;
    const { licensing, inference } = startDependencies;

    const agentService = new AgentService({ http });
    const attachmentsService = new AttachmentsService();
    const eventsService = new EventsService();
    const chatService = new ChatService({ http, events: eventsService });
    const conversationsService = new ConversationsService({ http });
    const docLinksService = new DocLinksService(core.docLinks.links);
    const toolsService = new ToolsService({ http });
    const accessChecker = new AgentBuilderAccessChecker({ licensing, inference });

    if (!this.setupServices) {
      throw new Error('plugin start called before plugin setup');
    }

    const { navigationService } = this.setupServices;

    const internalServices: AgentBuilderInternalService = {
      agentService,
      attachmentsService,
      chatService,
      conversationsService,
      docLinksService,
      navigationService,
      toolsService,
      startDependencies,
      accessChecker,
      eventsService,
    };

    this.internalServices = internalServices;

    const hasAgentBuilder = core.application.capabilities.agentBuilder?.show === true;

    const openFlyoutInternal = (options?: OpenConversationFlyoutOptions) => {
      const config = options ?? this.conversationFlyoutActiveConfig;

      // If a flyout is already open, update its props instead of creating a new one
      if (this.activeFlyoutRef && this.flyoutCallbacks) {
        this.flyoutCallbacks.updateProps(config);
        return { flyoutRef: this.activeFlyoutRef };
      }

      // Create new flyout and set up prop updates
      const { flyoutRef } = openConversationFlyout(config, {
        coreStart: core,
        services: internalServices,
        onRegisterCallbacks: (callbacks) => {
          this.flyoutCallbacks = callbacks;
        },
        onClose: () => {
          this.activeFlyoutRef = null;
          this.flyoutCallbacks = null;
        },
      });

      this.activeFlyoutRef = flyoutRef;

      return { flyoutRef };
    };

    const agentBuilderService: AgentBuilderPluginStart = {
      agents: createPublicAgentsContract({ agentService }),
      attachments: createPublicAttachmentContract({ attachmentsService }),
      tools: createPublicToolContract({ toolsService }),
      events: createPublicEventsContract({ eventsService }),
      setConversationFlyoutActiveConfig: (config: EmbeddableConversationProps) => {
        // set config until flyout is next opened
        this.conversationFlyoutActiveConfig = config;
        // if there is already an active flyout, update its props
        if (this.activeFlyoutRef && this.flyoutCallbacks) {
          this.flyoutCallbacks.updateProps(config);
          return { flyoutRef: this.activeFlyoutRef };
        }
      },
      clearConversationFlyoutActiveConfig: () => {
        this.conversationFlyoutActiveConfig = {};
        if (this.activeFlyoutRef && this.flyoutCallbacks) {
          // Removes stale browserApiTools from the flyout
          this.flyoutCallbacks.resetBrowserApiTools();
        }
      },
      openConversationFlyout: (options?: OpenConversationFlyoutOptions) => {
        return openFlyoutInternal(options);
      },
      toggleConversationFlyout: (options?: OpenConversationFlyoutOptions) => {
        if (this.activeFlyoutRef) {
          const flyoutRef = this.activeFlyoutRef;
          // Be defensive: clear local references immediately in case the underlying overlay doesn't
          // synchronously invoke our onClose callback.
          this.activeFlyoutRef = null;
          this.flyoutCallbacks = null;
          flyoutRef.close();
          return;
        }

        openFlyoutInternal(options);
      },
    };

    if (hasAgentBuilder) {
      core.chrome.navControls.registerRight({
        mount: (element) => {
          ReactDOM.render(
            <AgentBuilderNavControlInitiator
              coreStart={core}
              pluginsStart={startDependencies}
              agentBuilderService={agentBuilderService}
            />,
            element,
            () => {}
          );

          return () => {
            ReactDOM.unmountComponentAtNode(element);
          };
        },
        // right before the user profile
        order: 1001,
      });
    }

    return agentBuilderService;
  }
}
