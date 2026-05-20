import type { StoredMapAttributes } from '../../../server';
import type { MapByReferenceState, MapByValueState } from '../types';
type StoredMapByReferenceState = Omit<MapByReferenceState, 'savedObjectId'>;
type StoredByValueState = Omit<MapByValueState, 'attributes'> & {
    attributes: StoredMapAttributes;
};
export type StoredMapEmbeddableState = StoredMapByReferenceState | StoredByValueState;
export {};
