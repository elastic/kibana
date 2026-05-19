import type { LensSavedObject } from '../../server/content_management';
import type { LensItemResponse } from './lens_client';
/**
 * Converts Lens Response Item to Lens Saved Object
 *
 * This is only needed as the visualize plugin assumes we only use CM.
 */
export declare function getLensSOFromResponse({ item: { id, references, ...attributes }, meta: { type, createdAt, updatedAt, createdBy, updatedBy, managed, originId }, }: LensItemResponse): LensSavedObject;
