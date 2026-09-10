/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dynamic } from '@kbn/shared-ux-utility';
import { LogsSharedPlugin } from './plugin';

export type {
  LogsSharedClientSetupExports,
  LogsSharedClientStartExports,
  LogsSharedClientSetupDeps,
  LogsSharedClientStartDeps,
} from './types';

// This exports static code and TypeScript types,
// as well as, Kibana Platform `plugin()` initializer.
export function plugin() {
  return new LogsSharedPlugin();
}

// Containers & Hook
export { LogViewProvider, useLogViewContext, useLogView } from './hooks/use_log_view';

// Shared components
export type { LogAIAssistantDocument } from './components/log_ai_assistant/log_ai_assistant';
export type { LogAIAssistantProps } from './components/log_ai_assistant/log_ai_assistant';
export type { LogsOverviewProps } from './components/logs_overview';

export const LogEntryFlyout = dynamic(
  () => import('./components/logging/log_entry_flyout/log_entry_flyout')
);
export const LogAIAssistant = dynamic(
  () => import('./components/log_ai_assistant/log_ai_assistant')
);

export const OpenInLogsExplorerButton = dynamic(
  () => import('./components/open_in_logs_explorer_button')
);

// State machine utils
export {
  getLogViewReferenceFromUrl,
  initializeFromUrl,
  listenForUrlChanges,
  updateContextInUrl,
} from './observability_logs/log_view_state';
export type {
  LogViewContextWithError,
  LogViewContextWithResolvedLogView,
  LogViewNotificationChannel,
  LogViewNotificationEvent,
} from './observability_logs/log_view_state';
