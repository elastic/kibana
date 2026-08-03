import useAsyncFn from 'react-use/lib/useAsyncFn';
import type { FindFieldsMetadataRequestQuery, FindFieldsMetadataResponsePayload } from '../../../common/latest';
import type { FieldsMetadataServiceStart } from '../../services/fields_metadata';
interface UseFieldsMetadataFactoryDeps {
    fieldsMetadataService: FieldsMetadataServiceStart;
}
export type UseFieldsMetadataParams = FindFieldsMetadataRequestQuery;
export interface UseFieldsMetadataReturnType {
    fieldsMetadata: FindFieldsMetadataResponsePayload['fields'] | undefined;
    streamFieldsMetadata: FindFieldsMetadataResponsePayload['streamFields'] | undefined;
    loading: boolean;
    error: Error | undefined;
    reload: ReturnType<typeof useAsyncFn>[1];
}
export type UseFieldsMetadataHook = (params?: UseFieldsMetadataParams, deps?: Parameters<typeof useAsyncFn>[1]) => UseFieldsMetadataReturnType;
export declare const createUseFieldsMetadataHook: ({ fieldsMetadataService, }: UseFieldsMetadataFactoryDeps) => UseFieldsMetadataHook;
export {};
