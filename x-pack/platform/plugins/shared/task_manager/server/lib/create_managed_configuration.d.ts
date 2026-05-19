import type { Observable } from 'rxjs';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerConfig } from '../config';
export declare const ADJUST_THROUGHPUT_INTERVAL: number;
export declare const PREFERRED_MAX_POLL_INTERVAL: number;
export declare const INTERVAL_AFTER_BLOCK_EXCEPTION: number;
export declare const MIN_COST: number;
export declare const MIN_WORKERS = 1;
interface ErrorScanResult {
    count: number;
    isBlockException: boolean;
}
export declare function createCapacityScan(config: TaskManagerConfig, logger: Logger, startingCapacity: number): import("rxjs").OperatorFunction<ErrorScanResult, number>;
export declare function createPollIntervalScan(logger: Logger, startingPollInterval: number, claimStrategy: string, tmUtilizationQueue: (value?: number | undefined) => number[]): import("rxjs").OperatorFunction<[{
    count: any;
    isBlockException: any;
}, any], number>;
export declare function countErrors(errors$: Observable<Error>, countInterval: number): Observable<ErrorScanResult>;
export declare function calculateStartingCapacity(config: TaskManagerConfig, logger: Logger, defaultCapacity: number): number;
export {};
