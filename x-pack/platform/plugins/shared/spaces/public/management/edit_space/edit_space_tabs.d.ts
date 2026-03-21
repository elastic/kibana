import type { Capabilities, ScopedHistory } from '@kbn/core/public';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { Space } from '../../../common';
export interface EditSpaceTab {
    id: string;
    name: string;
    content: JSX.Element;
    append?: JSX.Element;
    href?: string;
}
export interface GetTabsProps {
    space: Space;
    rolesCount?: number;
    isRoleManagementEnabled: boolean;
    features: KibanaFeature[];
    history: ScopedHistory;
    capabilities: Capabilities & {
        roles?: {
            view: boolean;
            save: boolean;
        };
    };
    allowFeatureVisibility: boolean;
    allowSolutionVisibility: boolean;
    isSecurityEnabled: boolean;
    enableSecurityLink: string;
}
export declare const getTabs: ({ space, features, history, capabilities, rolesCount, isRoleManagementEnabled, isSecurityEnabled, enableSecurityLink, ...props }: GetTabsProps) => EditSpaceTab[];
