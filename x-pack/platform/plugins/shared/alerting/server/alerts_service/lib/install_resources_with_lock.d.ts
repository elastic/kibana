import type { Logger } from '@kbn/core/server';
import type { Observable } from 'rxjs';
/**
 * Minimal contract needed from `@kbn/lock-manager`'s `LockManagerService`, kept
 * local so the alerts service (and its tests) don't depend on the concrete class.
 */
export interface ResourceInstallLockManager {
    withLock(lockId: string, callback: () => Promise<void>, options?: {
        metadata?: Record<string, unknown>;
    }): Promise<void>;
}
export interface InstallResourcesWithLockOpts {
    /** When omitted, the install runs directly without any coordination. */
    lockManager?: ResourceInstallLockManager;
    lockId: string;
    logger: Logger;
    installFn: () => Promise<void>;
    /** Included in wait/error logs so multi-node raw logs can be attributed. */
    serverUuid?: string;
    /** Stops lock acquisition and retry delays when the plugin shuts down. */
    pluginStop$?: Observable<void>;
    /**
     * Override the delay between acquisition attempts, in milliseconds.
     * Production uses exponential backoff (1s, 2s, 4s, 8s, 16s, 30s). Tests pass
     * `0` to avoid waiting.
     */
    retryDelayMs?: number;
}
export declare const INSTALL_LOCK_INITIAL_RETRY_DELAY_MS = 1000;
export declare const INSTALL_LOCK_MAX_RETRY_DELAY_MS = 30000;
/**
 * Delay after a failed acquisition: 1s, 2s, 4s, 8s, 16s, then 30s capped.
 * `failedAttempt` is 1-based (the attempt that just lost the race).
 */
export declare const getInstallLockRetryDelayMs: (failedAttempt: number) => number;
/**
 * Runs alerts-as-data resource installation under a cluster-wide lock so that,
 * across multiple Kibana nodes, only one node installs a given resource set at a
 * time — reducing the burst of concurrent requests to Elasticsearch on startup.
 *
 * A node that loses the race retries acquisition with exponential backoff until
 * it holds the lock, or until plugin shutdown. Contention never causes an
 * unlocked install: there is no attempt cap, so a large fleet is not truncated
 * by a fixed retry budget. A hung holder keeps the lock via TTL extension; other
 * nodes wait (and abort on `pluginStop$`). A crashed holder expires the lease
 * and the next waiter acquires it.
 */
export declare const installResourcesWithLock: ({ lockManager, lockId, logger, installFn, serverUuid, pluginStop$, retryDelayMs, }: InstallResourcesWithLockOpts) => Promise<void>;
