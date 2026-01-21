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
import type { EmbeddableConversationProps } from './embeddable/types';
import type { OpenConversationFlyoutOptions } from './flyout/types';
import {
  setSidebarServices,
  setSidebarRuntimeContext,
  clearSidebarRuntimeContext,
  getParamsSchema,
} from './sidebar';
import type { SidebarParams } from './sidebar';

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

    // Register sidebar app for conversation UI
    core.chrome.sidebar.registerApp<SidebarParams>({
      appId: 'agentBuilder',
      getParamsSchema,
      loadComponent: async () => {
        const { SidebarConversation } = await import('./sidebar/sidebar_conversation');
        return SidebarConversation;
      },
    });

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

    // Initialize services for sidebar component (accessed via observable)
    setSidebarServices(core, internalServices);

    const hasAgentBuilder = core.application.capabilities.agentBuilder?.show === true;
    const sidebar = core.chrome.sidebar.getApp<SidebarParams>('agentBuilder');

    // Helper to open sidebar with given options
    const openSidebarInternal = (options?: OpenConversationFlyoutOptions) => {
      const config = options ?? this.conversationFlyoutActiveConfig;

      // Store non-serializable runtime context
      if (config.browserApiTools || config.attachments) {
        setSidebarRuntimeContext({
          browserApiTools: config.browserApiTools,
          attachments: config.attachments,
        });
      }

      // Open sidebar with serializable params only
      sidebar.open({
        sessionTag: config.sessionTag ?? 'default',
        agentId: config.agentId,
        initialMessage: config.initialMessage,
        autoSendInitialMessage: config.autoSendInitialMessage,
        newConversation: config.newConversation,
      });

      // Return a flyoutRef-compatible object for backward compatibility
      const flyoutRef: ConversationFlyoutRef = {
        close: () => {
          sidebar.close();
          clearSidebarRuntimeContext();
        },
      };

      return { flyoutRef };
    };

    const agentBuilderService: AgentBuilderPluginStart = {
      agents: createPublicAgentsContract({ agentService }),
      attachments: createPublicAttachmentContract({ attachmentsService }),
      tools: createPublicToolContract({ toolsService }),
      events: createPublicEventsContract({ eventsService }),
      setConversationFlyoutActiveConfig: (config: EmbeddableConversationProps) => {
        // Store config for next open
        this.conversationFlyoutActiveConfig = config;

        // Update runtime context for sidebar
        setSidebarRuntimeContext({
          browserApiTools: config.browserApiTools,
          attachments: config.attachments,
        });

        // update serializable params for sidebar
        sidebar.setParams({
          sessionTag: config.sessionTag ?? 'default',
          agentId: config.agentId,
          initialMessage: config.initialMessage,
          autoSendInitialMessage: config.autoSendInitialMessage,
          newConversation: config.newConversation,
        });
      },
      clearConversationFlyoutActiveConfig: () => {
        this.conversationFlyoutActiveConfig = {};
        clearSidebarRuntimeContext();
      },
      openConversationFlyout: (options?: OpenConversationFlyoutOptions) => {
        // Use sidebar implementation
        return openSidebarInternal(options);
      },
      toggleConversationFlyout: (options?: OpenConversationFlyoutOptions) => {
        // Check if sidebar is open for agentBuilder
        if (
          // TODO improve isOpen API to check for specific app
          core.chrome.sidebar.isOpen() &&
          core.chrome.sidebar.getCurrentAppId() === 'agentBuilder'
        ) {
          sidebar.close();
          clearSidebarRuntimeContext();
          return;
        }

        openSidebarInternal(options);
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
