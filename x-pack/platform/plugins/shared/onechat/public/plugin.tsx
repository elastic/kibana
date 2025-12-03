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
import {
  AGENT_BUILDER_ENABLED_SETTING_ID,
  AGENT_BUILDER_NAV_ENABLED_SETTING_ID,
} from '@kbn/management-settings-ids';
import { docLinks } from '../common/doc_links';
import { ONECHAT_FEATURE_ID, uiPrivileges } from '../common/features';
import { registerLocators } from './locator/register_locators';
import { registerAnalytics, registerApp, registerManagementSection } from './register';
import { OnechatNavControlInitiator } from './components/nav_control/lazy_onechat_nav_control';
import {
  AgentBuilderAccessChecker,
  AgentService,
  ChatService,
  ConversationsService,
  NavigationService,
  ToolsService,
  type OnechatInternalService,
} from './services';
import { createPublicToolContract } from './services/tools';
import type {
  ConfigSchema,
  OnechatPluginSetup,
  OnechatPluginStart,
  OnechatSetupDependencies,
  OnechatStartDependencies,
} from './types';
import { openConversationFlyout } from './flyout/open_conversation_flyout';
import type { EmbeddableConversationProps } from './embeddable/types';
import type { OpenConversationFlyoutOptions } from './flyout/types';
import type { ConversationFlyoutRef } from './types';

export class OnechatPlugin
  implements
    Plugin<
      OnechatPluginSetup,
      OnechatPluginStart,
      OnechatSetupDependencies,
      OnechatStartDependencies
    >
{
  logger: Logger;
  private conversationFlyoutActiveConfig: EmbeddableConversationProps = {};
  private internalServices?: OnechatInternalService;
  private setupServices?: {
    navigationService: NavigationService;
  };
  private activeFlyoutRef: ConversationFlyoutRef | null = null;
  private updateFlyoutPropsCallback: ((props: EmbeddableConversationProps) => void) | null = null;

  constructor(context: PluginInitializerContext<ConfigSchema>) {
    this.logger = context.logger.get();
  }
  setup(
    core: CoreSetup<OnechatStartDependencies, OnechatPluginStart>,
    deps: OnechatSetupDependencies
  ): OnechatPluginSetup {
    const isAgentBuilderEnabled = core.settings.client.get<boolean>(
      AGENT_BUILDER_ENABLED_SETTING_ID,
      true
    );

    const navigationService = new NavigationService({
      management: deps.management.locator,
      licenseManagement: deps.licenseManagement?.locator,
    });

    this.setupServices = { navigationService };

    if (isAgentBuilderEnabled) {
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
    }

    try {
      core.getStartServices().then(([coreStart]) => {
        const { capabilities } = coreStart.application;
        if (capabilities[ONECHAT_FEATURE_ID][uiPrivileges.showManagement]) {
          registerManagementSection({ core, management: deps.management });
        }
      });
    } catch (error) {
      this.logger.error('Error registering Agent Builder management section', error);
    }

    return {};
  }

  start(core: CoreStart, startDependencies: OnechatStartDependencies): OnechatPluginStart {
    const { http } = core;
    const { licensing, inference } = startDependencies;
    docLinks.setDocLinks(core.docLinks.links);

    const agentService = new AgentService({ http });
    const chatService = new ChatService({ http });
    const conversationsService = new ConversationsService({ http });
    const toolsService = new ToolsService({ http });
    const accessChecker = new AgentBuilderAccessChecker({ licensing, inference });

    if (!this.setupServices) {
      throw new Error('plugin start called before plugin setup');
    }

    const { navigationService } = this.setupServices;

    const internalServices: OnechatInternalService = {
      agentService,
      chatService,
      conversationsService,
      navigationService,
      toolsService,
      startDependencies,
      accessChecker,
    };

    this.internalServices = internalServices;

    const isAgentBuilderEnabled = core.settings.client.get<boolean>(
      AGENT_BUILDER_ENABLED_SETTING_ID,
      true
    );
    const isAgentBuilderNavEnabled = core.settings.client.get<boolean>(
      AGENT_BUILDER_NAV_ENABLED_SETTING_ID,
      false
    );

    const onechatService: OnechatPluginStart = {
      tools: createPublicToolContract({ toolsService }),
      setConversationFlyoutActiveConfig: (config: EmbeddableConversationProps) => {
        // set config until flyout is next opened
        this.conversationFlyoutActiveConfig = config;
        // if there is already an active flyout, update its props
        if (this.activeFlyoutRef && this.updateFlyoutPropsCallback) {
          this.updateFlyoutPropsCallback(config);
          return { flyoutRef: this.activeFlyoutRef };
        }
      },
      clearConversationFlyoutActiveConfig: () => {
        this.conversationFlyoutActiveConfig = {};
      },
      openConversationFlyout: (options?: OpenConversationFlyoutOptions) => {
        const config = options ?? this.conversationFlyoutActiveConfig;

        // If a flyout is already open, update its props instead of creating a new one
        if (this.activeFlyoutRef && this.updateFlyoutPropsCallback) {
          this.updateFlyoutPropsCallback(config);
          return { flyoutRef: this.activeFlyoutRef };
        }

        // Create new flyout and set up prop updates
        const { flyoutRef } = openConversationFlyout(config, {
          coreStart: core,
          services: internalServices,
          onPropsUpdate: (callback) => {
            this.updateFlyoutPropsCallback = callback;
          },
          onClose: () => {
            this.activeFlyoutRef = null;
            this.updateFlyoutPropsCallback = null;
          },
        });

        this.activeFlyoutRef = flyoutRef;

        return { flyoutRef };
      },
    };

    if (isAgentBuilderEnabled && isAgentBuilderNavEnabled) {
      core.chrome.navControls.registerRight({
        mount: (element) => {
          ReactDOM.render(
            <OnechatNavControlInitiator
              coreStart={core}
              pluginsStart={startDependencies}
              onechatService={onechatService}
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

    return onechatService;
  }
}
