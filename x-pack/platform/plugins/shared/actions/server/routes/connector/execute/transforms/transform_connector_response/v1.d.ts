import type { ConnectorExecuteResponseV1 } from '../../../../../../common/routes/connector/response';
import type { ActionTypeExecutorResult } from '../../../../../types';
export declare const transformExecuteConnectorResponse: ({ actionId, retry, serviceMessage, ...res }: ActionTypeExecutorResult<unknown>) => ConnectorExecuteResponseV1;
