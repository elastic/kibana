import type { Observable } from 'rxjs';
import type { TaskLifecycleEvent } from '../polling_lifecycle';
/**
 * Emits a delay amount in ms to apply to polling whenever the task store exceeds a threshold of claim claimClashes
 */
export declare function delayOnClaimConflicts(capacityConfiguration$: Observable<number>, pollIntervalConfiguration$: Observable<number>, taskLifecycleEvents$: Observable<TaskLifecycleEvent>, claimClashesPercentageThreshold: number, runningAverageWindowSize: number): Observable<number>;
