import type { TypeOf } from '@kbn/config-schema';
import type { findMutedAlertsOptionsSchema, findMutedAlertsParamsSchema } from '../schemas';
export type FindMutedAlertsOptions = TypeOf<typeof findMutedAlertsOptionsSchema>;
export type FindMutedAlertsParams = TypeOf<typeof findMutedAlertsParamsSchema>;
