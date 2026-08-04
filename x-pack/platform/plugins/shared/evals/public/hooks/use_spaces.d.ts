export interface AccessibleSpace {
    id: string;
    name: string;
}
export interface AccessibleSpacesResult {
    isEnabled: boolean;
    isLoading: boolean;
    activeSpaceId?: string;
    /** All spaces the current user can access. */
    spaces: AccessibleSpace[];
}
/**
 * Lists the spaces the current user can access (plus the active space), so an
 * experiment can be assigned to spaces other than the one it is created in.
 *
 * Accessible spaces are read from the public `GET /api/spaces/space` endpoint
 * (which already scopes to the caller's authorized spaces).
 */
export declare const useAccessibleSpaces: (options?: {
    enabled?: boolean;
}) => AccessibleSpacesResult;
