import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import type { UserProfileData } from '../../common';
export interface AuthenticationProviderProps {
    authc: AuthenticationServiceSetup;
}
declare const AuthenticationProvider: import("react").FC<import("react").PropsWithChildren<AuthenticationProviderProps>>, useAuthentication: () => AuthenticationServiceSetup;
export { AuthenticationProvider, useAuthentication };
export declare function useCurrentUser(): import("react-use/lib/useAsyncFn").AsyncState<import("@kbn/core/packages/security/common/src/authentication/authenticated_user").AuthenticatedUser>;
export declare function useUserProfile<T extends UserProfileData>(dataPath?: string): import("react-use/lib/useAsyncFn").AsyncState<import("../../common").GetUserProfileResponse<T>>;
