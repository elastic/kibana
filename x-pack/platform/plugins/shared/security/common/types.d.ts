import type { AuthenticationProvider } from '@kbn/security-plugin-types-common';
export declare enum LogoutReason {
    'SESSION_EXPIRED' = "SESSION_EXPIRED",
    'SESSION_IDLE_TIMEOUT' = "SESSION_IDLE_TIMEOUT",
    'SESSION_LIFESPAN_TIMEOUT' = "SESSION_LIFESPAN_TIMEOUT",
    'CONCURRENCY_LIMIT' = "CONCURRENCY_LIMIT",
    'AUTHENTICATION_ERROR' = "AUTHENTICATION_ERROR",
    'LOGGED_OUT' = "LOGGED_OUT",
    'UNAUTHENTICATED' = "UNAUTHENTICATED"
}
export interface SessionInfo {
    expiresInMs: number | null;
    canBeExtended: boolean;
    provider: AuthenticationProvider;
    expirationReason?: LogoutReason.SESSION_IDLE_TIMEOUT | LogoutReason.SESSION_LIFESPAN_TIMEOUT;
}
export interface SecurityCheckupState {
    displayAlert: boolean;
}
