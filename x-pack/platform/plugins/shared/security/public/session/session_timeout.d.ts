import type { HttpSetup, NotificationsStart, OverlayStart } from '@kbn/core/public';
import type { SessionExpired } from './session_expired';
import type { StartServices } from '..';
import type { SessionInfo } from '../../common/types';
export interface SessionState extends Pick<SessionInfo, 'expiresInMs' | 'canBeExtended' | 'expirationReason'> {
    lastExtensionTime: number;
}
export declare class SessionTimeout {
    private startServices;
    private notifications;
    private overlays;
    private sessionExpired;
    private http;
    private tenant;
    private channel?;
    private isVisible;
    private isFetchingSessionInfo;
    private consecutiveErrorCount;
    private snoozedWarningState?;
    private sessionState$;
    private subscription?;
    private warningToast?;
    private warningModal?;
    private stopActivityMonitor?;
    private stopVisibilityMonitor?;
    private removeHttpInterceptor?;
    private stopRefreshTimer?;
    private stopWarningTimer?;
    private stopLogoutTimer?;
    constructor(startServices: StartServices, notifications: NotificationsStart, overlays: OverlayStart, sessionExpired: Pick<SessionExpired, 'logout'>, http: HttpSetup, tenant: string);
    start(): Promise<SessionState | undefined>;
    stop(): void;
    /**
     * Event handler that receives session information from other browser tabs.
     */
    private handleChannelMessage;
    private isSessionState;
    /**
     * HTTP request interceptor which ensures that API calls extend the session only if tab is
     * visible.
     */
    private handleHttpRequest;
    /**
     * Event handler that tracks user activity and extends the session if needed.
     */
    private handleUserActivity;
    /**
     * Event handler that tracks page visibility.
     */
    private handleVisibilityChange;
    private resetTimers;
    private toggleEventHandlers;
    private shouldExtend;
    private fetchSessionInfo;
    private showWarning;
    private hideWarning;
}
/**
 * Starts a timer that uses a native `setTimeout` under the hood. When `timeout` is larger
 * than the maximum supported one then method calls itself recursively as many times as needed.
 * @param callback A function to be executed after the timer expires.
 * @param timeout The time, in milliseconds the timer should wait before the specified function is
 * executed.
 * @returns Function to stop the timer.
 */
export declare function startTimer(callback: () => void, timeout: number, updater?: (id: number) => void): () => void;
