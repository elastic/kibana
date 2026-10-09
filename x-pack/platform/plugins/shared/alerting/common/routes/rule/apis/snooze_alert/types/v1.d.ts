import type { TypeOf } from '@kbn/config-schema';
import type { snoozeAlertParamsSchemaV1, snoozeAlertQuerySchemaV1, snoozeAlertBodySchemaV1 } from '..';
export type SnoozeAlertRequestParams = TypeOf<typeof snoozeAlertParamsSchemaV1>;
export type SnoozeAlertRequestQuery = TypeOf<typeof snoozeAlertQuerySchemaV1>;
export type SnoozeAlertRequestBody = TypeOf<typeof snoozeAlertBodySchemaV1>;
