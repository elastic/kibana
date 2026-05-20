import type { FC } from 'react';
import type { OriginSaveModalProps, OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
export type OriginSaveProps = OnSaveProps & {
    returnToOrigin: boolean;
    newTags?: string[];
};
export type TagEnhancedSavedObjectSaveModalOriginProps = Omit<OriginSaveModalProps, 'onSave'> & {
    initialTags: string[];
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    onSave: (props: OriginSaveProps) => Promise<void>;
};
export declare const TagEnhancedSavedObjectSaveModalOrigin: FC<TagEnhancedSavedObjectSaveModalOriginProps>;
