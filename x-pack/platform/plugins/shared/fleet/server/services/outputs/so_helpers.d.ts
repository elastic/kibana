import type { Output } from '../../../common/types';
import type { OutputSOAttributes } from '../../types';
type Nullable<T> = {
    [P in keyof T]: T[P] | null;
};
export declare const _getFieldsToIncludeEncryptedSO: () => string[];
/**
 * Patch update data to make sure we do not break encrypted field
 * allow_edit and secrets field are not excluded from AAD, we cannot change this anymore,
 * we need to make sure each time those fields are changed encrypted field are changed too.
 */
export declare function patchUpdateDataWithRequireEncryptedAADFields(updateData: Nullable<Partial<OutputSOAttributes>>, originalOutput: Output): Nullable<Partial<OutputSOAttributes>>;
export {};
