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
  ConversationSidebarRef,
} from './types';
import type { EmbeddableConversationProps } from './embeddable/types';
import type { OpenConversationSidebarOptions } from './sidebar/types';
import {
  setSidebarServices,
  setSidebarRuntimeContext,
  clearSidebarRuntimeContext,
} from './sidebar';

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
  private conversationActiveConfig: EmbeddableConversationProps = {};
  private internalServices?: AgentBuilderInternalService;
  private setupServices?: {
    navigationService: NavigationService;
  };
  private activeSidebarRef: ConversationSidebarRef | null = null;
  private sidebarCallbacks: {
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

    core.chrome.sidebar.registerApp({
      appId: 'agentBuilder',
      restoreOnReload: false,
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

    setSidebarServices(core, internalServices);

    const hasAgentBuilder = core.application.capabilities.agentBuilder?.show === true;
    const sidebar = core.chrome.sidebar.getApp('agentBuilder');

    const openSidebarInternal = (options?: OpenConversationSidebarOptions) => {
      const config = options ?? this.conversationActiveConfig;

      // If already open, update props instead of creating new
      if (this.activeSidebarRef && this.sidebarCallbacks) {
        this.sidebarCallbacks.updateProps(config);
        return { flyoutRef: this.activeSidebarRef };
      }

      // Set runtime context before opening
      setSidebarRuntimeContext({
        options: config,
        onRegisterCallbacks: (callbacks) => {
          this.sidebarCallbacks = callbacks;
        },
        onClose: () => {
          this.activeSidebarRef = null;
          this.sidebarCallbacks = null;
          clearSidebarRuntimeContext();
        },
      });

      sidebar.open();

      const sidebarRef: ConversationSidebarRef = {
        close: () => {
          sidebar.close();
          this.activeSidebarRef = null;
          this.sidebarCallbacks = null;
          clearSidebarRuntimeContext();
        },
      };

      this.activeSidebarRef = sidebarRef;
      return { flyoutRef: sidebarRef };
    };

    const agentBuilderService: AgentBuilderPluginStart = {
      agents: createPublicAgentsContract({ agentService }),
      attachments: createPublicAttachmentContract({ attachmentsService }),
      tools: createPublicToolContract({ toolsService }),
      events: createPublicEventsContract({ eventsService }),
      setConversationFlyoutActiveConfig: (config: EmbeddableConversationProps) => {
        // Set config until sidebar is next opened
        this.conversationActiveConfig = config;
        // If there is already an active sidebar, update its props
        if (this.activeSidebarRef && this.sidebarCallbacks) {
          this.sidebarCallbacks.updateProps(config);
          return { flyoutRef: this.activeSidebarRef };
        }
      },
      clearConversationFlyoutActiveConfig: () => {
        this.conversationActiveConfig = {};
        if (this.activeSidebarRef && this.sidebarCallbacks) {
          // Removes stale browserApiTools from the sidebar
          this.sidebarCallbacks.resetBrowserApiTools();
        }
      },
      openConversationFlyout: (options?: OpenConversationSidebarOptions) => {
        return openSidebarInternal(options);
      },
      toggleConversationFlyout: (options?: OpenConversationSidebarOptions) => {
        if (this.activeSidebarRef) {
          const sidebarRef = this.activeSidebarRef;
          // Be defensive: clear local references immediately in case the sidebar doesn't
          // synchronously invoke our onClose callback.
          this.activeSidebarRef = null;
          this.sidebarCallbacks = null;
          sidebarRef.close();
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
