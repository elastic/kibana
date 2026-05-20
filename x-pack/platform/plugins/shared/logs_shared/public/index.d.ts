import type { LogsSharedPlugin } from './plugin';
export type { LogsSharedClientSetupExports, LogsSharedClientStartExports, LogsSharedClientSetupDeps, LogsSharedClientStartDeps, } from './types';
export declare function plugin(): LogsSharedPlugin;
export { LogViewProvider, useLogViewContext, useLogView } from './hooks/use_log_view';
export type { LogAIAssistantDocument } from './components/log_ai_assistant/log_ai_assistant';
export type { LogAIAssistantProps } from './components/log_ai_assistant/log_ai_assistant';
export type { LogsOverviewProps } from './components/logs_overview';
export declare const LogEntryFlyout: import("react").ForwardRefExoticComponent<import("./components/logging/log_entry_flyout/log_entry_flyout").LogEntryFlyoutProps & import("react").RefAttributes<{}>>;
export declare const LogAIAssistant: import("react").ForwardRefExoticComponent<import("./components/log_ai_assistant/log_ai_assistant").LogAIAssistantProps & import("react").RefAttributes<{}>>;
export declare const OpenInLogsExplorerButton: import("react").ForwardRefExoticComponent<Pick<(import("@elastic/eui/src/components/common").DisambiguateSet<import("@elastic/eui/src/components/button/button_empty/button_empty").EuiButtonEmptyPropsForAnchor, import("@elastic/eui/src/components/button/button_empty/button_empty").EuiButtonEmptyPropsForButton> & import("@elastic/eui/src/components/button/button_empty/button_empty").CommonEuiButtonEmptyProps & {
    onClick?: import("react").MouseEventHandler<HTMLButtonElement>;
} & import("react").ButtonHTMLAttributes<HTMLButtonElement>) | (import("@elastic/eui/src/components/common").DisambiguateSet<import("@elastic/eui/src/components/button/button_empty/button_empty").EuiButtonEmptyPropsForButton, import("@elastic/eui/src/components/button/button_empty/button_empty").EuiButtonEmptyPropsForAnchor> & import("@elastic/eui/src/components/button/button_empty/button_empty").CommonEuiButtonEmptyProps & {
    href?: string;
    onClick?: import("react").MouseEventHandler<HTMLAnchorElement>;
} & import("react").AnchorHTMLAttributes<HTMLAnchorElement>), "href" | "flush" | "size"> & {
    testSubject: string;
} & import("react").RefAttributes<{}>>;
export { getLogViewReferenceFromUrl, initializeFromUrl, listenForUrlChanges, updateContextInUrl, } from './observability_logs/log_view_state';
export type { LogViewContextWithError, LogViewContextWithResolvedLogView, LogViewNotificationChannel, LogViewNotificationEvent, } from './observability_logs/log_view_state';
