import type { ConnectorWithExtraFindData } from '../../../../../application/connector/types';
import type { GetAllConnectorsResponseV1 } from '../../../../../../common/routes/connector/response';
export declare const transformGetAllConnectorsResponse: (results: ConnectorWithExtraFindData[]) => GetAllConnectorsResponseV1;
