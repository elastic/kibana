import type { UserProfileAPIClient } from '../account_management';
import type { UserAPIClient } from '../management';
/**
 * Represents a collection of the high-level abstractions (clients) to interact with the Security specific APIs.
 */
export interface SecurityApiClients {
    userProfiles: UserProfileAPIClient;
    users: UserAPIClient;
}
/**
 * The `SecurityApiClientsProvider` React context provider is used to provide UI components with the Security API
 * clients that can be subsequently consumed through `useSecurityApiClients` hook.
 */
export declare const SecurityApiClientsProvider: import("react").FC<import("react").PropsWithChildren<SecurityApiClients>>, useSecurityApiClients: () => {
    userProfiles: UserProfileAPIClient;
    users: UserAPIClient;
};
