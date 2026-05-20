import type { ApplicationStart, Capabilities } from '@kbn/core/public';
import type { Space } from '../../../common';
import type { SolutionViewSwitchTourProps } from '../solution_view_switch_tour';
export interface UseSolutionViewSwitchAnnouncementsParams {
    activeSpace: Space | null;
    capabilities: Capabilities;
    areAnnouncementsEnabled: boolean;
    closeSpaceSelector: () => void;
    navigateToApp: ApplicationStart['navigateToApp'];
}
export interface UseSolutionViewSwitchAnnouncementsResult {
    /** Whether to show the notification dot on the space avatar */
    showNotification: boolean;
    /** Props for the tour component, null if tour should not be shown */
    tourProps: SolutionViewSwitchTourProps | null;
}
export declare const useSolutionViewSwitchAnnouncements: ({ activeSpace, capabilities, areAnnouncementsEnabled, closeSpaceSelector, navigateToApp, }: UseSolutionViewSwitchAnnouncementsParams) => UseSolutionViewSwitchAnnouncementsResult;
