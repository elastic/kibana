import React from 'react';
interface AttachmentErrorCalloutProps {
    title: string;
    announceOnMount?: boolean;
    'data-test-subj'?: string;
}
/**
 * Shared "something is wrong with this attachment" callout. Used both when an
 * attachment type is not registered and as the fallback for a renderer that
 * throws, so the two failure modes look the same to the user.
 */
export declare const AttachmentErrorCallout: React.NamedExoticComponent<AttachmentErrorCalloutProps>;
export {};
