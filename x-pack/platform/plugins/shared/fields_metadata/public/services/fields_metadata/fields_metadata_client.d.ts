import type { HttpStart } from '@kbn/core/public';
import type { FindFieldsMetadataRequestQuery, FindFieldsMetadataResponsePayload } from '../../../common/latest';
import type { IFieldsMetadataClient } from './types';
export declare class FieldsMetadataClient implements IFieldsMetadataClient {
    private readonly http;
    private cache;
    constructor(http: HttpStart);
    find(params: FindFieldsMetadataRequestQuery): Promise<FindFieldsMetadataResponsePayload>;
}
