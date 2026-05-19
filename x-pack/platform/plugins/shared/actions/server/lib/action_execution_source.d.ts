import type { KibanaRequest, SavedObjectReference } from '@kbn/core/server';
export declare enum ActionExecutionSourceType {
    SAVED_OBJECT = "SAVED_OBJECT",
    HTTP_REQUEST = "HTTP_REQUEST",
    NOTIFICATION = "NOTIFICATION",
    BACKGROUND_TASK = "BACKGROUND_TASK"
}
export interface ActionExecutionSource<T> {
    type: ActionExecutionSourceType;
    source: T;
}
export type HttpRequestExecutionSource = ActionExecutionSource<KibanaRequest>;
export type SavedObjectExecutionSource = ActionExecutionSource<Omit<SavedObjectReference, 'name'>>;
export interface BackgroundTaskSource {
    taskId: string;
    taskType: string;
}
export type BackgroundTaskExecutionSource = ActionExecutionSource<BackgroundTaskSource>;
export interface NotificationSource {
    requesterId: string;
    connectorId: string;
}
export type NotificationExecutionSource = ActionExecutionSource<NotificationSource>;
export declare function asHttpRequestExecutionSource(source: KibanaRequest): HttpRequestExecutionSource;
export declare function asEmptySource(type: ActionExecutionSourceType): ActionExecutionSource<{}>;
export declare function asSavedObjectExecutionSource(source: Omit<SavedObjectReference, 'name'>): SavedObjectExecutionSource;
export declare function asNotificationExecutionSource(source: NotificationSource): NotificationExecutionSource;
export declare function asBackgroundTaskExecutionSource(source: BackgroundTaskSource): BackgroundTaskExecutionSource;
export declare function isHttpRequestExecutionSource(executionSource?: ActionExecutionSource<unknown>): executionSource is HttpRequestExecutionSource;
export declare function isSavedObjectExecutionSource(executionSource?: ActionExecutionSource<unknown>): executionSource is SavedObjectExecutionSource;
export declare function isNotificationExecutionSource(executionSource?: ActionExecutionSource<unknown>): executionSource is NotificationExecutionSource;
export declare function isBackgroundTaskExecutionSource(executionSource?: ActionExecutionSource<unknown>): executionSource is BackgroundTaskExecutionSource;
