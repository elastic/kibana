import type { Query } from '@kbn/es-query';
import type { LayerDescriptor } from '../../../../common/descriptor_types';
import { ES_GEO_FIELD_TYPE } from '../../../../common/constants';
export interface CreateLayerDescriptorParams {
    indexPatternId: string;
    geoFieldName: string;
    geoFieldType: ES_GEO_FIELD_TYPE;
    query?: Query;
}
export declare function createLayerDescriptor({ indexPatternId, geoFieldName, geoFieldType, query, }: CreateLayerDescriptorParams): LayerDescriptor;
