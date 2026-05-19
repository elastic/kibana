import type { FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';
import type { MappingField } from './mappings';
/**
 * response for {@link processFieldCapsResponse}
 */
export interface FieldListFromFieldCapsResponse {
    /**
     * List of indices included in the field_caps response
     */
    indices: string[];
    /**
     * List of non-conflicting fields
     */
    fields: MappingField[];
}
/**
 * Process a field caps response and return the list of targeted indices and
 * the list of corresponding non-conflicting fields.
 */
export declare const processFieldCapsResponse: (fieldCapsRes: FieldCapsResponse) => FieldListFromFieldCapsResponse;
export declare const processFieldCapsResponsePerIndex: (fieldCapsRes: FieldCapsResponse) => Record<string, MappingField[]>;
