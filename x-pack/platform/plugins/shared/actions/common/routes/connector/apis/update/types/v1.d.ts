import type { TypeOf } from '@kbn/config-schema';
import type { updateConnectorBodySchemaV1, updateConnectorParamsSchemaV1 } from '..';
export type UpdateConnectorParams = TypeOf<typeof updateConnectorParamsSchemaV1>;
export type UpdateConnectorBody = TypeOf<typeof updateConnectorBodySchemaV1>;
