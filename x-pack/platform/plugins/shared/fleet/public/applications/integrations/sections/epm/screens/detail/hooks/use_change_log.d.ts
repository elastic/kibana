/**
 * @param packageName the package to get the changelog for
 * @param latestVersion the version of changelog for the specified package
 * @param currentVersion is used to display the changelog starting from this version up to the latest version
 */
export declare const useChangelog: (packageName: string, latestVersion: string, currentVersion?: string) => {
    changelog: import("../utils/changelog_utils").ChangelogEntry<import("../utils").ChangeType>[];
    breakingChanges: import("../utils").BreakingChangesLog | null;
    error: import("../../../../../hooks").RequestError | null;
    isLoading: boolean;
};
