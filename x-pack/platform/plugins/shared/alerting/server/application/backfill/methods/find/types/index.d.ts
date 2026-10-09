import type { TypeOf } from '@kbn/config-schema';
import type { Backfill } from '../../../result/types';
import type { findBackfillQuerySchema, findBackfillResultSchema } from '../schemas';
export type FindBackfillParams = TypeOf<typeof findBackfillQuerySchema>;
export type FindBackfillResult = Omit<TypeOf<typeof findBackfillResultSchema>, 'data'> & {
    data: Backfill[];
};
