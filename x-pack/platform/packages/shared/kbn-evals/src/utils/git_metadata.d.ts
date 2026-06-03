export interface GitMetadata {
    branch: string | null;
    commitSha: string | null;
}
export declare function getGitMetadata(): GitMetadata;
