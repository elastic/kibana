export declare const DEFAULT_SPACE_ID = "default";
/**
 * The identifier in a saved object's `namespaces` array when it is shared globally to all spaces.
 */
export declare const ALL_SPACES_ID = "*";
/**
 * The identifier in a saved object's `namespaces` array when it is shared to an unknown space (e.g., one that the end user is not authorized to see).
 */
export declare const UNKNOWN_SPACE = "?";
/**
 * The minimum number of spaces required to show a search control.
 */
export declare const SPACE_SEARCH_COUNT_THRESHOLD = 8;
/**
 * The maximum number of characters allowed in the Space Avatar's initials
 */
export declare const MAX_SPACE_INITIALS = 2;
/**
 * The path to enter a space.
 */
export declare const ENTER_SPACE_PATH = "/spaces/enter";
/**
 * The 'classic' solution view is the default, non-project type of solution view
 */
export declare const SOLUTION_VIEW_CLASSIC: "classic";
/**
 * The feature privileges constants are used to identify the granularity of the configured feature visibility
 */
export declare const FEATURE_PRIVILEGES_ALL: "all";
export declare const FEATURE_PRIVILEGES_READ: "read";
export declare const FEATURE_PRIVILEGES_CUSTOM: "custom";
/**
 * The API version numbers used with the versioned router.
 */
export declare const API_VERSIONS: {
    public: {
        v1: string;
    };
};
