import React from 'react';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type { LensPublicStart } from '@kbn/lens-plugin/public';
import type { DashboardStart } from '@kbn/dashboard-plugin/public';
export interface FlyoutComponentProps {
    onClose: () => void;
}
export declare function createFlyout(FlyoutComponent: React.FunctionComponent<any>, coreStart: CoreStart, share: SharePluginStart, data: DataPublicPluginStart, dashboardService: DashboardStart, lens?: LensPublicStart): Promise<void>;
