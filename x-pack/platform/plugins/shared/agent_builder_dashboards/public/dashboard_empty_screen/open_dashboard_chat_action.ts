/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import {
  OPEN_DASHBOARD_CHAT_ACTION_ID,
  type OpenDashboardChatActionContext,
} from '@kbn/dashboard-plugin/public';
import type { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';

export class OpenDashboardChatAction implements Action<OpenDashboardChatActionContext> {
  public readonly id = OPEN_DASHBOARD_CHAT_ACTION_ID;
  public readonly type = OPEN_DASHBOARD_CHAT_ACTION_ID;

  constructor(private readonly openChat: AgentBuilderPluginStart['openChat']) {}

  public getDisplayName(): string {
    return OPEN_DASHBOARD_CHAT_ACTION_ID;
  }

  public getIconType(): string {
    return 'productAgent';
  }

  public async isCompatible(
    _context: ActionExecutionContext<OpenDashboardChatActionContext>
  ): Promise<boolean> {
    return true;
  }

  public async execute({
    initialMessage,
  }: ActionExecutionContext<OpenDashboardChatActionContext>): Promise<void> {
    this.openChat({
      newConversation: true,
      initialMessage,
      autoSendInitialMessage: false,
      sessionTag: 'dashboard',
    });
  }
}
