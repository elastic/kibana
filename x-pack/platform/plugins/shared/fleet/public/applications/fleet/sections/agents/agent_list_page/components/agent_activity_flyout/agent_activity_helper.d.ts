import type { ActionStatus } from '../../../../../types';
export declare function getOtherDaysActions(actions: ActionStatus[]): {
    [day: string]: ActionStatus[];
};
export declare function getTodayActions(actions: ActionStatus[]): ActionStatus[];
