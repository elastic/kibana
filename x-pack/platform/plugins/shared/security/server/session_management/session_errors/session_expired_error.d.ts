import { SessionError, SessionErrorReason } from './session_error';
/**
 * Thrown when a session can no longer be used due to expiration.
 *
 * - `SESSION_IDLE_TIMEOUT` — the session was inactive longer than the configured idle timeout.
 * - `SESSION_LIFESPAN_TIMEOUT` — the session exceeded its maximum allowed lifespan.
 * - `SESSION_EXPIRED` (default) — generic expiration when the specific cause is not determined.
 */
export declare class SessionExpiredError extends SessionError {
    constructor(reason?: SessionErrorReason.SESSION_EXPIRED | SessionErrorReason.SESSION_IDLE_TIMEOUT | SessionErrorReason.SESSION_LIFESPAN_TIMEOUT);
}
