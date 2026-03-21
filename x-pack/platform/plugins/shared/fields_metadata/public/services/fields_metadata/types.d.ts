import type { HttpStart } from '@kbn/core/public';
import type { FindFieldsMetadataRequestQuery, FindFieldsMetadataResponsePayload } from '../../../common/latest';
export interface FieldsMetadataServiceSetup {
}
export interface FieldsMetadataServiceStart {
    getClient: () => Promise<IFieldsMetadataClient>;
}
export interface FieldsMetadataServiceStartDeps {
    http: HttpStart;
}
export interface IFieldsMetadataClient {
    find(params: FindFieldsMetadataRequestQuery): Promise<FindFieldsMetadataResponsePayload>;
}
