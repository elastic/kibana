import type { Logger } from '@kbn/logging';
import type { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
export declare function optimizeTaskStateForFlapping<State extends AlertInstanceState, Context extends AlertInstanceContext, RecoveryActionGroupId extends string>(logger: Logger, recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> | undefined, maxAlerts: number): Record<string, Alert<State, Context, RecoveryActionGroupId>>;
export declare function shouldKeepTrackingRecovered({ flapping, flappingHistory, }: {
    flapping?: boolean;
    flappingHistory?: boolean[];
}): boolean;
interface RecoveredAlertTrackingFields {
    getFlappingHistory: () => boolean[] | undefined;
    getFlapping?: () => boolean | undefined;
}
export declare function getRecoveredAlertIdsToStopTracking(trackedRecoveredAlerts: Record<string, RecoveredAlertTrackingFields>, maxAlerts: number): string[];
export declare function getAlertIdsOverMaxLimit(trackedRecoveredAlerts: Record<string, {
    getFlappingHistory: () => boolean[] | undefined;
}>, maxAlerts: number): string[];
export {};
