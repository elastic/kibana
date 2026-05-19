import type { Reference } from '@kbn/content-management-utils';
import type { MapAttributes, StoredMapAttributes } from '../../server';
export declare function transformMapAttributesIn(mapState: MapAttributes): {
    attributes: StoredMapAttributes;
    references: Reference[];
};
