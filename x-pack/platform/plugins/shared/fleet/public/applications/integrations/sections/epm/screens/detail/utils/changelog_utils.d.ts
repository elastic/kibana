export type YamlParseFn = (value: string) => unknown;
export declare enum ChangeType {
    Enhancement = "enhancement",
    BreakingChange = "breaking-change",
    BugFix = "bugfix"
}
interface Change<T extends ChangeType = ChangeType> {
    description: string;
    link: string;
    type: T;
}
export interface ChangelogEntry<T extends ChangeType = ChangeType> {
    version: string;
    changes: Array<Change<T>>;
}
export type Changelog = ChangelogEntry[];
export type BreakingChangesLog = Array<ChangelogEntry<ChangeType.BreakingChange>>;
export declare const formatChangelog: (parsedChangelog: Changelog) => string;
export declare const parseYamlChangelog: (parse: YamlParseFn, changelogText: string | null | undefined, latestVersion: string, currentVersion?: string) => ChangelogEntry<ChangeType>[];
export declare const getBreakingChanges: (changelog: Changelog) => BreakingChangesLog;
export {};
