import type { ConnectorAuthStatusResponseV1 } from '../../../../../../common/routes/connector/response';
import type { GetAuthStatusResult } from '../../../../../application/connector/methods/get_auth_status/types';
export declare const transformAuthStatusResponseV1: (result: GetAuthStatusResult) => ConnectorAuthStatusResponseV1;
