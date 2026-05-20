import type { SavedObject } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '@kbn/dashboard-plugin/server';
import type { DataViewSavedObjectAttrs } from '@kbn/data-views-plugin/common/data_views';
import type { LensAttributes } from '@kbn/lens-embeddable-utils';
import type { ContentPackEntry } from '.';
export declare const SUPPORTED_SAVED_OBJECT_TYPE: Record<ContentPackSavedObject['type'], string>;
export declare const isSupportedSavedObjectType: (entry: SavedObject<unknown> | ContentPackEntry) => entry is ContentPackSavedObject;
export declare const isDashboardFile: (rootDir: string, filepath: string) => boolean;
export declare const isSupportedReferenceType: (type: string) => boolean;
export type ContentPackDashboard = SavedObject<DashboardSavedObjectAttributes> & {
    type: 'dashboard';
};
export type ContentPackDataView = SavedObject<DataViewSavedObjectAttrs> & {
    type: 'index-pattern';
};
export type ContentPackLens = SavedObject<LensAttributes> & {
    type: 'lens';
};
export type ContentPackSavedObject = ContentPackDashboard | ContentPackDataView | ContentPackLens;
export interface SavedObjectLink {
    source_id: string;
    target_id: string;
}
export type SavedObjectLinkWithReferences = SavedObjectLink & {
    references: SavedObjectLink[];
};
export interface ContentPackSavedObjectLinks {
    dashboards: SavedObjectLinkWithReferences[];
}
