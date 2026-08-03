import React from 'react';
export interface SavedObjectLinkProps {
    title: string;
    /** Resolved in-app href; when undefined the link renders disabled. */
    href?: string;
    /** Optional anchor target — set to `_blank` from contexts that should not navigate away (e.g. modals). */
    target?: '_blank';
    'data-test-subj'?: string;
}
export declare const SavedObjectLink: React.NamedExoticComponent<SavedObjectLinkProps>;
