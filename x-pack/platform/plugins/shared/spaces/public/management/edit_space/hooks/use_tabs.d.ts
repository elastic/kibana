import type { ScopedHistory } from '@kbn/core-application-browser';
import type { KibanaFeature } from '@kbn/features-plugin/public';
import type { Space } from '../../../../common';
import { type EditSpaceTab, type GetTabsProps } from '../edit_space_tabs';
type UseTabsProps = Pick<GetTabsProps, 'capabilities' | 'rolesCount'> & {
    space: Space | null;
    features: KibanaFeature[] | null;
    currentSelectedTabId: string;
    isRoleManagementEnabled: boolean;
    history: ScopedHistory;
    allowFeatureVisibility: boolean;
    allowSolutionVisibility: boolean;
    isSecurityEnabled: boolean;
    enableSecurityLink: string;
};
export declare const useTabs: ({ space, features, currentSelectedTabId, ...getTabsArgs }: UseTabsProps) => [EditSpaceTab[], JSX.Element | undefined];
export {};
