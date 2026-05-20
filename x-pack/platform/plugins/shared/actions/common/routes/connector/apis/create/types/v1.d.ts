import type { TypeOf } from '@kbn/config-schema';
import type { createConnectorRequestParamsSchemaV1, createConnectorRequestBodySchemaV1 } from '..';
export type CreateConnectorRequestParams = TypeOf<typeof createConnectorRequestParamsSchemaV1>;
export type CreateConnectorRequestBody = TypeOf<typeof createConnectorRequestBodySchemaV1>;
