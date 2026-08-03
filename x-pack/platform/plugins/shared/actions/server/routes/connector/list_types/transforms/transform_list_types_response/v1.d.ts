import type { ConnectorType } from '../../../../../application/connector/types';
import type { GetAllConnectorTypesResponseV1 } from '../../../../../../common/routes/connector/response';
export declare const transformListTypesResponse: (results: ConnectorType[]) => GetAllConnectorTypesResponseV1;
