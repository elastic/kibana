export interface GithubUrlInfo {
    owner: string;
    repo: string;
    /** Branch, tag or commit. Defaults to 'main' when not present in the URL. */
    ref: string;
    /** Path within the repository (without leading/trailing slashes), or undefined for root. */
    path?: string;
}
/**
 * Parses a GitHub repository URL into its components.
 *
 * Supported formats:
 * - `{baseUrl}/{owner}/{repo}`
 * - `{baseUrl}/{owner}/{repo}.git`
 * - `{baseUrl}/{owner}/{repo}/tree/{ref}`
 * - `{baseUrl}/{owner}/{repo}/tree/{ref}/{path}`
 * - `{baseUrl}/{owner}/{repo}/blob/{ref}/{path}`
 */
export declare const parseGithubUrl: (url: string, baseUrl?: string) => GithubUrlInfo;
/**
 * Returns the URL to download the repository archive as a zip file.
 */
export declare const getGithubArchiveUrl: ({ owner, repo, ref }: GithubUrlInfo, baseUrl?: string) => string;
/**
 * Checks whether a URL is a GitHub URL (tree, blob, or bare repo).
 */
export declare const isGithubUrl: (url: string, baseUrl?: string) => boolean;
