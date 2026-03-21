/**
 * A direct zip file URL. The zip itself contains the plugin at its root.
 */
export interface ZipPluginUrl {
    type: 'zip';
    downloadUrl: string;
}
/**
 * A GitHub-hosted plugin. The entire repo archive is downloaded as a zip,
 * then scoped to `pluginPath` within it.
 */
export interface GithubPluginUrl {
    type: 'github';
    downloadUrl: string;
    pluginPath?: string;
}
export type ResolvedPluginUrl = ZipPluginUrl | GithubPluginUrl;
export interface ResolvePluginUrlOptions {
    githubBaseUrl?: string;
}
/**
 * Classifies a URL and resolves it into a normalized descriptor
 * that `parsePluginFromUrl` can consume.
 *
 * Supported inputs:
 * - GitHub folder URL (`/tree/`)  -> download repo archive, scope to folder
 * - GitHub `plugin.json` blob URL (`/blob/`) -> derive the plugin folder, then same as above
 * - Direct `.zip` URL -> download the zip as-is
 */
export declare const resolvePluginUrl: (url: string, options?: ResolvePluginUrlOptions) => ResolvedPluginUrl;
