import type { ConnectorCreateParams } from '../../../../../application/connector/methods/create/types';
import type { CreateConnectorRequestBodyV1 } from '../../../../../../common/routes/connector/apis/create';
export declare const transformCreateConnectorBody: ({ connector_type_id: actionTypeId, name, config, secrets, }: CreateConnectorRequestBodyV1) => ConnectorCreateParams["action"];
