import React from 'react';
export interface SavedObjectAddedEventProps {
    soType: string;
    /** Foreign SO id (matches the `attachmentId` field on the SO attachment payload). */
    attachmentId: string;
    /** Cached title from the attachment payload; falls back to "Untitled" when absent. */
    title?: string;
    /** Localized prefix shown before the link, e.g. `"added dashboard"`. */
    label: string;
    'data-test-subj'?: string;
}
export declare const SavedObjectAddedEvent: React.NamedExoticComponent<SavedObjectAddedEventProps>;
