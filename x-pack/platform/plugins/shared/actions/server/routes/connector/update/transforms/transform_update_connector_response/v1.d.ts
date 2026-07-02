import type { ConnectorResponseV1 } from '../../../../../../common/routes/connector/response';
import type { Connector } from '../../../../../application/connector/types';
export declare const transformUpdateConnectorResponse: ({ actionTypeId, isPreconfigured, isMissingSecrets, isDeprecated, isSystemAction, isConnectorTypeDeprecated, authMode, ...res }: Connector) => ConnectorResponseV1;
