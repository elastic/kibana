import type { RRule } from '../../../r_rule/rrule_type';
import type { ScheduleRequest } from '../../types/v1';
export declare const transformRRuleToCustomSchedule: (snoozeSchedule: {
    duration: number;
    rRule: RRule;
}) => ScheduleRequest;
