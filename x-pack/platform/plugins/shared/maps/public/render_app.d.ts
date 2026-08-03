import React from 'react';
import type { CoreStart, AppMountParameters } from '@kbn/core/public';
export declare function renderApp({ element, history, onAppLeave, setHeaderActionMenu, theme$ }: AppMountParameters, { coreStart, AppUsageTracker, }: {
    coreStart: CoreStart;
    AppUsageTracker: React.FC<{
        children: React.ReactNode;
    }>;
}): Promise<() => void>;
