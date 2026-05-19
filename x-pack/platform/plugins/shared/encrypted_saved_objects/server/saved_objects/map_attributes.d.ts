import type { SavedObjectUnsanitizedDoc } from '@kbn/core/server';
export declare function mapAttributes<T>(obj: SavedObjectUnsanitizedDoc<T>, mapper: (attributes: T) => T): import("@kbn/core/packages/saved-objects/server").SavedObjectDoc<T> & {
    references?: import("@kbn/core/server").SavedObjectReference[];
} & {
    attributes: T;
};
