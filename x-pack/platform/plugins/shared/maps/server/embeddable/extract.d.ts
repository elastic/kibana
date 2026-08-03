import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { StoredMapAttributes } from '../saved_objects/types';
export declare function extract(state: EmbeddableStateWithType & {
    attributes?: StoredMapAttributes;
}): {
    state: EmbeddableStateWithType & {
        attributes?: StoredMapAttributes;
    };
    references: never[];
} | {
    state: {
        attributes: StoredMapAttributes;
        enhancements?: import("@kbn/utility-types").SerializableRecord;
        type: string;
    };
    references: import("@kbn/core/server").SavedObjectReference[];
};
