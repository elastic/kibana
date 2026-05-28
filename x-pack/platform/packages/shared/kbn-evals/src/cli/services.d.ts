import type { ToolingLog } from '@kbn/tooling-log';
export type ServiceName = 'edot' | 'scout';
interface ServiceEntry {
    pid: number;
    logFile: string;
    startedAt: string;
    /** SHA-256 of KIBANA_TESTING_AI_CONNECTORS at boot time (Scout only) */
    connectorsHash?: string;
    /** The serverConfigSet used to start Scout */
    serverConfigSet?: string;
}
interface ServicesState {
    edot?: ServiceEntry;
    scout?: ServiceEntry;
}
export declare const readState: (repoRoot: string) => ServicesState;
export declare const isAlive: (pid: number) => boolean;
export declare const connectorsHash: () => string;
export declare const isServiceRunning: (repoRoot: string, name: ServiceName) => boolean;
/**
 * Returns true if the running Scout was started with a different set of connectors
 * than what's currently in the environment, or with a different serverConfigSet.
 */
export declare const isScoutStale: (repoRoot: string, requestedConfigSet?: string) => {
    stale: boolean;
    reason?: string;
};
/**
 * Spawn a detached service process. Stdout/stderr are written to a log file.
 * Returns the child PID.
 */
export declare const startService: (repoRoot: string, name: ServiceName, command: string, args: string[], log: ToolingLog, opts?: {
    connectorsHash?: string;
    serverConfigSet?: string;
    env?: Record<string, string | undefined>;
}) => number;
/**
 * Stop a service by PID. Sends SIGTERM, waits briefly, then SIGKILL if needed.
 */
export declare const stopService: (repoRoot: string, name: ServiceName, log: ToolingLog) => Promise<boolean>;
export declare const stopAll: (repoRoot: string, log: ToolingLog) => Promise<void>;
/**
 * Tail a service log file, streaming new lines to the ToolingLog.
 * Returns a cleanup function to stop tailing.
 */
export declare const tailLog: (repoRoot: string, name: ServiceName, log: ToolingLog, opts?: {
    fromStart?: boolean;
}) => (() => void);
export {};
