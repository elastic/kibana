/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardApi } from '@kbn/dashboard-plugin/public';
import type { Action } from '@kbn/ui-actions-plugin/public';
import { openDashboardChat } from './open_dashboard_chat';

export const ACTION_CREATE_DASHBOARD_WITH_CHAT = 'createDashboardWithChatAction';

const defaultPrompt = i18n.translate(
  'xpack.agentBuilderDashboards.addPanelFlyout.defaultPromptDetail',
  {
    defaultMessage: 'Create a time series chart to see my logs over time',
  }
);

interface DashboardActionContext {
  embeddable: DashboardApi;
}

interface DashboardAddPanelChatActionExtension {
  isHighlighted: true;
}

export class DashboardAddPanelChatAction
  implements Action<DashboardActionContext, DashboardAddPanelChatActionExtension>
{
  public readonly id = ACTION_CREATE_DASHBOARD_WITH_CHAT;
  public readonly type = ACTION_CREATE_DASHBOARD_WITH_CHAT;
  public readonly order = 100;
  public readonly extension = { isHighlighted: true } as const;

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
    return 'sparkles';
  }

  public async isCompatible(): Promise<boolean> {
    return true;
  }

  public async execute({ embeddable }: DashboardActionContext): Promise<void> {
    embeddable.clearOverlays();
    openDashboardChat(this.openChat, defaultPrompt);
  }
}
