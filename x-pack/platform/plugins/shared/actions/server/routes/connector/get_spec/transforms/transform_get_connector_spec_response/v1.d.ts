import type { ConnectorMetadata } from '@kbn/connector-specs';
import type { GetConnectorSpecResponseV1 } from '../../../../../../common/routes/connector/response';
export interface GetConnectorSpecServiceResult {
    metadata: ConnectorMetadata;
    schema: Record<string, unknown>;
    isTestable: boolean;
}
export declare const transformGetConnectorSpecResponse: (spec: GetConnectorSpecServiceResult) => GetConnectorSpecResponseV1;
