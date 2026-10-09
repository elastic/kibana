import type { TypeOf } from '@kbn/config-schema';
import type { SpaceId } from '@kbn/core-spaces-common';
import type { backfillSchema, backfillScheduleSchema } from '../schemas';
export type BackfillSchedule = TypeOf<typeof backfillScheduleSchema>;
export type Backfill = Omit<TypeOf<typeof backfillSchema>, 'spaceId'> & {
    spaceId: SpaceId;
};
