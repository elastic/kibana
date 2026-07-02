import type { TypeOf } from '@kbn/config-schema';
import type { executeConnectorRequestParamsSchemaV1, executeConnectorRequestBodySchemaV1 } from '..';
export type ExecuteConnectorRequestParams = TypeOf<typeof executeConnectorRequestParamsSchemaV1>;
export type ExecuteConnectorRequestBody = TypeOf<typeof executeConnectorRequestBodySchemaV1>;
