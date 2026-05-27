import type { Logger } from '@kbn/core/server';
import type { ConcreteTaskInstance, IntervalSchedule, RruleSchedule } from '../task';
export declare function getNextRunAt({ runAt, startedAt, schedule }: Pick<ConcreteTaskInstance, 'runAt' | 'startedAt' | 'schedule'>, taskDelayThresholdForPreciseScheduling: number | undefined, logger: Logger): Date;
export declare function calculateNextRunAtFromSchedule({ schedule, startDate, }: {
    schedule?: IntervalSchedule | RruleSchedule;
    startDate: Date;
}): number;
