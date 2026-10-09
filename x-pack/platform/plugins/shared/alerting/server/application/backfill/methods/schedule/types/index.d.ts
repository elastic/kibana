import type { TypeOf } from '@kbn/config-schema';
import type { Backfill } from '../../../result/types';
import type { scheduleBackfillErrorSchema, scheduleBackfillParamSchema, scheduleBackfillParamsSchema } from '../schemas';
export type ScheduleBackfillParam = TypeOf<typeof scheduleBackfillParamSchema>;
export type ScheduleBackfillParams = TypeOf<typeof scheduleBackfillParamsSchema>;
export type ScheduleBackfillError = TypeOf<typeof scheduleBackfillErrorSchema>;
/** Success arm is Backfill (branded spaceId); error arm stays schema-derived. */
export type ScheduleBackfillResult = Backfill | ScheduleBackfillError;
export type ScheduleBackfillResults = ScheduleBackfillResult[];
