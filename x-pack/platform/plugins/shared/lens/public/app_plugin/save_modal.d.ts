import React from 'react';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { HasLibraryTransforms } from '@kbn/presentation-publishing';
import type { OriginSaveProps } from './tags_saved_object_save_modal_origin_wrapper';
import type { DashboardSaveProps } from './tags_saved_object_save_modal_dashboard_wrapper';
export type SaveProps = OriginSaveProps | DashboardSaveProps;
export interface Props {
    hasLibraryItemWithTitle: HasLibraryTransforms['hasLibraryItemWithTitle'];
    savingToLibraryPermitted?: boolean;
    originatingApp?: string;
    getOriginatingPath?: (dashboardId: string) => string;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    tagsIds: string[];
    title?: string;
    savedObjectId?: string;
    description?: string;
    getAppNameFromId: () => string | undefined;
    returnToOriginSwitchLabel?: string;
    returnToOrigin?: boolean;
    onClose: () => void;
    onSave: (props: SaveProps, options: {
        saveToLibrary: boolean;
    }) => Promise<void>;
    managed: boolean;
}
export declare const SaveModal: (props: Props) => React.JSX.Element;
