import type { EuiSideNavItemType } from '@elastic/eui';
import type { ReactNode } from 'react';
import type { MlLocatorParams } from '@kbn/ml-common-types/locator';
import type { MlRoute } from '../../routing';
export interface Tab {
    id: string;
    name: ReactNode;
    disabled?: boolean;
    items?: Tab[];
    testSubj?: string;
    pathId?: MlLocatorParams['page'];
    onClick?: () => Promise<void>;
    /** Indicates if item should be marked as active with nested routes */
    highlightNestedRoutes?: boolean;
    /** List of route IDs related to the side nav entry */
    relatedRouteIds?: string[];
}
export declare function useSideNavItems(activeRoute: MlRoute | undefined): EuiSideNavItemType<unknown>[];
