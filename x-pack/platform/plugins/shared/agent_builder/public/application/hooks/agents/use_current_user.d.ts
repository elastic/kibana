import type { UserIdAndName } from '@kbn/agent-builder-common';
/**
 * Fetches the current user from Kibana's User Profile service.
 */
export declare const useCurrentUser: ({ enabled }?: {
    enabled?: boolean;
}) => {
    currentUser: UserIdAndName | null;
    isLoading: boolean;
};
