/**
 * Fetch the latest available version of Elastic Agent that is compatible with the current Kibana version.
 *
 * e.g. if the current Kibana version is 8.12.0, and there is an 8.12.2 patch release of agent available,
 * this function will return "8.12.2".
 */
export declare const getLatestAvailableAgentVersion: ({ includeCurrentVersion, ignoreCache, }?: {
    includeCurrentVersion?: boolean;
    ignoreCache?: boolean;
}) => Promise<string>;
export declare const getLatestAgentAvailableDockerImageVersion: ({ includeCurrentVersion, ignoreCache, }?: {
    includeCurrentVersion?: boolean;
    ignoreCache?: boolean;
}) => Promise<string>;
export declare const getAvailableVersions: ({ includeCurrentVersion, ignoreCache, }?: {
    includeCurrentVersion?: boolean;
    ignoreCache?: boolean;
}) => Promise<string[]>;
