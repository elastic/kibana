import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import type { StoredMapAttributes } from '../saved_objects/types';
export declare function inject(state: EmbeddableStateWithType & {
    attributes?: StoredMapAttributes;
}, references: Reference[]): EmbeddableStateWithType & {
    attributes?: StoredMapAttributes;
};
