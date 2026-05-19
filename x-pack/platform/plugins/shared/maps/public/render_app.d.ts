import React from 'react';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
import type { SavedObjectTaggingPluginStart } from '@kbn/saved-objects-tagging-plugin/public';
export declare function renderApp({ element, history, onAppLeave, setHeaderActionMenu, theme$ }: AppMountParameters, { coreStart, AppUsageTracker, savedObjectsTagging, }: {
    coreStart: CoreStart;
    savedObjectsTagging?: SavedObjectTaggingPluginStart;
    AppUsageTracker: React.FC<{
        children: React.ReactNode;
    }>;
}): Promise<() => void>;
