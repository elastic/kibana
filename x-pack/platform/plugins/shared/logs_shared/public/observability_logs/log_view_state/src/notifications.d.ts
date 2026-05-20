import type { DataView } from '@kbn/data-views-plugin/public';
import type { LogViewReference, LogViewStatus, ResolvedLogView } from '../../../../common/log_views';
import type { LogViewContext, LogViewEvent } from './types';
export type LogViewNotificationEvent = {
    type: 'LOADING_LOG_VIEW_STARTED';
    logViewReference: LogViewReference;
} | {
    type: 'LOADING_LOG_VIEW_SUCCEEDED';
    resolvedLogView: ResolvedLogView<DataView>;
    status: LogViewStatus;
} | {
    type: 'LOADING_LOG_VIEW_FAILED';
    error: Error;
};
export declare const createLogViewNotificationChannel: () => import("@kbn/xstate-utils").NotificationChannel<import("./types").LogViewContextWithReference | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithResolvedLogView) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithResolvedLogView & import("./types").LogViewContextWithStatus) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithError) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithError), LogViewEvent, LogViewNotificationEvent>;
export declare const logViewNotificationEventSelectors: {
    loadingLogViewStarted: ({ context }: {
        context: LogViewContext;
        event: LogViewEvent;
    }) => LogViewNotificationEvent | undefined;
    loadingLogViewSucceeded: ({ context }: {
        context: LogViewContext;
        event: LogViewEvent;
    }) => LogViewNotificationEvent | undefined;
    loadingLogViewFailed: ({ context }: {
        context: LogViewContext;
        event: LogViewEvent;
    }) => LogViewNotificationEvent | undefined;
};
