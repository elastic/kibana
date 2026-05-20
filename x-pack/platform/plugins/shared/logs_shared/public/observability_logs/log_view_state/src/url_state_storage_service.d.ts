import type { IToasts } from '@kbn/core/public';
import type { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import type { LogViewReference } from '../../../../common/log_views';
import type { LogViewContext, LogViewEvent } from './types';
export declare const defaultLogViewKey = "logView";
interface LogViewUrlStateDependencies {
    logViewKey?: string;
    sourceIdKey?: string;
    toastsService: IToasts;
    urlStateStorage: IKbnUrlStateStorage;
}
export declare const updateContextInUrl: ({ urlStateStorage, logViewKey }: LogViewUrlStateDependencies) => ({ context }: {
    context: LogViewContext;
    event: LogViewEvent;
}) => void;
export declare const initializeFromUrl: ({ logViewKey, sourceIdKey, toastsService, urlStateStorage, }: LogViewUrlStateDependencies) => import("xstate").CallbackActorLogic<LogViewEvent, import("./types").LogViewContextWithReference | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithResolvedLogView) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithResolvedLogView & import("./types").LogViewContextWithStatus) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithError) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithError), import("xstate").EventObject>;
export declare const getLogViewReferenceFromUrl: ({ logViewKey, sourceIdKey, toastsService, urlStateStorage, }: LogViewUrlStateDependencies) => LogViewReference | null;
export declare const listenForUrlChanges: ({ urlStateStorage, logViewKey, }: {
    urlStateStorage: LogViewUrlStateDependencies["urlStateStorage"];
    logViewKey?: LogViewUrlStateDependencies["logViewKey"];
}) => import("xstate").ObservableActorLogic<LogViewEvent, import("./types").LogViewContextWithReference | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithResolvedLogView) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithResolvedLogView & import("./types").LogViewContextWithStatus) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithError) | (import("./types").LogViewContextWithReference & import("./types").LogViewContextWithLogView & import("./types").LogViewContextWithError), import("xstate").EventObject>;
export type InitializeFromUrl = ReturnType<typeof initializeFromUrl>;
export type UpdateContextInUrl = ReturnType<typeof updateContextInUrl>;
export type ListenForUrlChanges = ReturnType<typeof listenForUrlChanges>;
export {};
