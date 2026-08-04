import type { FC } from 'react';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
import type { DistributiveOmit } from '@elastic/eui';
export type DashboardSaveProps = OnSaveProps & {
    returnToOrigin: boolean;
    dashboardId?: string | null;
    addToLibrary?: boolean;
    newTags?: string[];
};
export type TagEnhancedSavedObjectSaveModalDashboardProps = DistributiveOmit<SaveModalDashboardProps, 'onSave'> & {
    initialTags: string[];
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    onSave: (props: DashboardSaveProps) => Promise<void>;
    getOriginatingPath?: (dashboardId: string) => string;
};
export declare const TagEnhancedSavedObjectSaveModalDashboard: FC<TagEnhancedSavedObjectSaveModalDashboardProps>;
