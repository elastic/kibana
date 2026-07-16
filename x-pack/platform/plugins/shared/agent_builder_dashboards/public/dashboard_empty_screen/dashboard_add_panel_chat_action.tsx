/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  CREATE_DASHBOARD_WITH_CHAT_ACTION_ID,
  type AddPanelActionExtension,
} from '@kbn/dashboard-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { openDashboardChat } from './open_dashboard_chat';

export const ACTION_CREATE_DASHBOARD_WITH_CHAT = CREATE_DASHBOARD_WITH_CHAT_ACTION_ID;

const defaultPrompt = i18n.translate(
  'xpack.agentBuilderDashboards.addPanelFlyout.defaultPromptDetail',
  {
    defaultMessage: 'Create a time series chart to see my logs over time',
  }
);

export class DashboardAddPanelChatAction implements Action<object, AddPanelActionExtension> {
  public readonly id = ACTION_CREATE_DASHBOARD_WITH_CHAT;
  public readonly type = ACTION_CREATE_DASHBOARD_WITH_CHAT;
  public readonly order = 100;
  public readonly extension: AddPanelActionExtension = { isHighlighted: true };

  constructor(private readonly openChat: AgentBuilderPluginStart['openChat']) {}

  public getDisplayName(): string {
    return i18n.translate('xpack.agentBuilderDashboards.addPanelFlyout.createWithChatButtonLabel', {
      defaultMessage: 'Create with Chat',
    });
  }

  public getDisplayNameTooltip(): string {
    return i18n.translate('xpack.agentBuilderDashboards.addPanelFlyout.createWithChatDescription', {
      defaultMessage: 'Let the agent build any panel for you.',
    });
  }

  public getIconType(): string {
    return 'productAgent';
  }

  public async isCompatible(): Promise<boolean> {
    return true;
  }

  public async execute(): Promise<void> {
    openDashboardChat(this.openChat, defaultPrompt);
  }
}
