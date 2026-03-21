import type { TypeOf } from '@kbn/config-schema';
import type { listTypesParamsSchema } from '../schemas';
type ListTypesParamsType = TypeOf<typeof listTypesParamsSchema>;
export interface ListTypesParams {
    featureId?: ListTypesParamsType['featureId'];
    includeSystemActionTypes?: ListTypesParamsType['includeSystemActionTypes'];
}
export {};
