import type { Logger } from '@kbn/core/server';
export interface LogInitialization {
    log: Logger;
}
interface MlLog {
    fatal: (message: string) => void;
    error: (message: string) => void;
    warn: (message: string) => void;
    info: (message: string) => void;
    debug: (message: string) => void;
    trace: (message: string) => void;
}
export declare let mlLog: MlLog;
export declare function initMlServerLog(logInitialization: LogInitialization): void;
export {};
