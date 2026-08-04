/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
import type { IdGenerator } from '.';
import { submitPrettifyWithScreenshot } from './submit_prettify_with_screenshot';

/**
 * Registers a Prettify App Menu item that appears in dashboard edit mode
 * immediately before "Exit edit" (order 0 < Exit edit's order 1).
 */
export const registerPrettifyAppMenuItem = ({
  dashboard,
  agentBuilder,
  draftAttachmentId,
}: {
  dashboard: DashboardStart;
  agentBuilder: AgentBuilderPluginStart;
  draftAttachmentId: IdGenerator;
}): (() => void) => {
  return dashboard.registerAppMenuItemGenerator(({ viewMode }) => {
    if (viewMode !== 'edit') {
      return undefined;
    }

    return {
      id: 'agentBuilderPrettify',
      order: 0,
      label: i18n.translate('xpack.agentBuilderDashboards.dashboardAppMenu.prettifyActionLabel', {
        defaultMessage: 'Prettify',
      }),
      iconType: 'brush',
      testId: 'dashboardAgentBuilderPrettifyButton',
      run: () => {
        void submitPrettifyWithScreenshot({ agentBuilder, dashboard, draftAttachmentId });
      },
    };
  });
};
