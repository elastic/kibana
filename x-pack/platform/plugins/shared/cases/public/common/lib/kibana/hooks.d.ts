import type { NavigateToAppOptions } from '@kbn/core/public';
import type { CasesPermissions } from '../../../../common';
import type { StartServices } from '../../../types';
export declare const useDateFormat: () => string;
export declare const useTimeZone: () => string;
export declare const useToasts: () => StartServices["notifications"]["toasts"];
export declare const useHttp: () => StartServices["http"];
interface UserRealm {
    name: string;
    type: string;
}
export interface AuthenticatedElasticUser {
    username: string;
    email: string;
    fullName: string;
    roles: string[];
    enabled: boolean;
    metadata?: {
        _reserved: boolean;
    };
    authenticationRealm: UserRealm;
    lookupRealm: UserRealm;
    authenticationProvider: string;
}
export declare const useCurrentUser: () => AuthenticatedElasticUser | null;
/**
 * Returns a full URL to the provided page path by using
 * kibana's `getUrlForApp()`
 */
export declare const useAppUrl: (appId?: string) => {
    getAppUrl: (options?: {
        deepLinkId?: string;
        path?: string;
        absolute?: boolean;
    }) => string;
};
/**
 * Navigate to any app using kibana's `navigateToApp()`
 * or by url using `navigateToUrl()`
 */
export declare const useNavigateTo: (appId?: string) => {
    navigateTo: ({ url, ...options }: {
        url?: string;
    } & NavigateToAppOptions) => void;
};
/**
 * Returns navigateTo and getAppUrl navigation hooks
 *
 */
export declare const useNavigation: (appId?: string) => {
    navigateTo: ({ url, ...options }: {
        url?: string;
    } & NavigateToAppOptions) => void;
    getAppUrl: (options?: {
        deepLinkId?: string;
        path?: string;
        absolute?: boolean;
    }) => string;
};
interface Capabilities {
    crud: boolean;
    read: boolean;
}
interface UseApplicationCapabilities {
    actions: Capabilities;
    generalCasesV3: CasesPermissions;
    visualize: Capabilities;
    dashboard: Capabilities;
}
/**
 * Returns the capabilities of various applications
 *
 */
export declare const useApplicationCapabilities: () => UseApplicationCapabilities;
export {};
