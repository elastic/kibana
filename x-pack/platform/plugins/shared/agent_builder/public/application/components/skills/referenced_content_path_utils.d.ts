import { normalizeRelativePathSegments } from '@kbn/agent-builder-common';
export { normalizeRelativePathSegments };
/**
 * Builds a human-friendly display path: `{skillFolder}/{subPath}/{fileName}.md`.
 * Uses {@link normalizeRelativePathSegments} for validation-style normalization, then strips
 * a leading `./` from the folder segment **only for this preview** (root becomes no extra segment).
 * Collapses duplicate slashes between parts.
 */
export declare const buildReferencedContentFullPathPreview: (skillFolderSegment: string, relativePath: string, fileNameWithoutExtension: string) => string;
