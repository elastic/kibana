/** How often (ms) the abort monitor polls the execution status to detect abort requests. */
export declare const ABORT_POLL_INTERVAL_MS = 2000;
/** How often (ms) followExecution polls for new events. */
export declare const FOLLOW_POLL_INTERVAL_MS = 500;
/** How often (ms) execution events are batched before being written to ES. */
export declare const EVENT_BATCH_INTERVAL_MS = 200;
/**
 * Max number of retries when reading remaining events after a terminal execution status.
 * ES near-real-time indexing may not make events searchable immediately after they are written.
 */
export declare const FOLLOW_TERMINAL_READ_MAX_RETRIES = 2;
/** Delay (ms) between retries when reading remaining events after terminal status. */
export declare const FOLLOW_TERMINAL_READ_RETRY_DELAY_MS = 500;
/** Safety timeout (ms) for followExecution polling. Prevents infinite polling if the execution never reaches a terminal status. */
export declare const FOLLOW_EXECUTION_TIMEOUT_MS: number;
/** Idle timeout (ms) for followExecution polling. If no new events are received and the execution status hasn't changed for this duration, polling is aborted. */
export declare const FOLLOW_EXECUTION_IDLE_TIMEOUT_MS: number;
