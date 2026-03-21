import type { ZipArchive } from './open_zip_archive';
/**
 * Creates a path-scoped view of a ZipArchive.
 *
 * All entry paths are rebased relative to the given prefix.
 * For example, if the underlying archive has entries like
 * `repo-main/plugins/my-plugin/skills/SKILL.md` and the prefix
 * is `repo-main/plugins/my-plugin/`, then `getEntryPaths()` will
 * return `skills/SKILL.md`.
 *
 * This is useful for GitHub archive downloads where the zip
 * contains a top-level `{repo}-{ref}/` directory and the plugin
 * may be nested inside it.
 */
export declare const createScopedArchive: (archive: ZipArchive, prefix: string) => ZipArchive;
/**
 * Detects the single top-level directory in a zip archive.
 *
 * GitHub archive zips always contain a single root folder
 * like `{repo}-{ref}/`. This function finds it by inspecting
 * the entry paths.
 *
 * Returns the prefix including trailing slash (e.g. `claude-code-main/`).
 */
export declare const detectArchiveRootPrefix: (archive: ZipArchive) => string;
