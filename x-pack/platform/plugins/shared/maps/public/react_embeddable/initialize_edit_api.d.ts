import type { MapEmbeddableState } from '../../common';
export declare function initializeEditApi(uuid: string, getState: () => MapEmbeddableState, parentApi?: unknown, savedObjectId?: string): {
    getTypeDisplayName?: undefined;
    onEdit?: undefined;
    isEditingEnabled?: undefined;
    getEditHref?: undefined;
} | {
    getTypeDisplayName: () => string;
    onEdit: () => Promise<void>;
    isEditingEnabled: () => boolean;
    getEditHref: () => Promise<string>;
};
