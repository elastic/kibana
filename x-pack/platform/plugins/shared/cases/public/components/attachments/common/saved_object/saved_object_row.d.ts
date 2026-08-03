import React from 'react';
import type { EuiButtonProps } from '@elastic/eui';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { FoundSavedObject } from './types';
export interface SavedObjectRowProps {
    savedObject: FoundSavedObject;
    /** Display title; falls back to the SO id when no `meta.title` is set. */
    title: string;
    /** Resolved display name for the SO type, e.g. "Dashboard". */
    typeLabel: string;
    /** Optional in-app href; when absent, the title renders as a disabled link. */
    href: string | undefined;
    /** Whether this SO is already attached to the case. */
    isAttached: boolean;
    /** True while this row's attach request is in flight (drives the spinner). */
    isAttachInFlight: boolean;
    /** True while any attach mutation from `useAttachSavedObject` is running. */
    isAttachingAny: boolean;
    taggingApi: SavedObjectsTaggingApi | undefined;
    onAttach: (savedObject: FoundSavedObject) => void;
    /** Override the default "Attach" action button label. */
    actionLabel?: string;
    /** Override the default "Attach" action icon. */
    actionIconType?: EuiButtonProps['iconType'];
}
export declare const SavedObjectRow: React.NamedExoticComponent<SavedObjectRowProps>;
