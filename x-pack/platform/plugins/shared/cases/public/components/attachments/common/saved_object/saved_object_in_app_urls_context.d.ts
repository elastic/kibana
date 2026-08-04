import React from 'react';
import type { CaseUI } from '../../../../../common/ui/types';
import { type SupportedSavedObjectType } from './helpers';
type UrlsBySoType = Record<SupportedSavedObjectType, Record<string, string | undefined>>;
export declare const useSavedObjectInAppUrlsContext: () => UrlsBySoType | null;
interface SavedObjectInAppUrlsProviderProps {
    caseData: CaseUI;
    children: React.ReactNode;
}
/**
 * Pre-resolves in-app URLs for every SO-typed attachment on the case (one
 * `bulk_get` per SO type) and exposes the result via context. Downstream
 * consumers (`SavedObjectAddedEvent` in the timeline, `SavedObjectAttachmentsTable`
 * in the attachments tab) read from this map instead of each firing their own
 * request — avoiding N requests in the activity feed when N SO events are
 * rendered.
 */
export declare const SavedObjectInAppUrlsProvider: React.FC<SavedObjectInAppUrlsProviderProps>;
export {};
