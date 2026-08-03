import React from 'react';
interface AttachmentAccordionProps {
    id: string;
    title: string;
    count: number;
    children: React.ReactNode;
}
export declare const AttachmentAccordion: {
    ({ id, title, count, children }: AttachmentAccordionProps): React.JSX.Element;
    displayName: string;
};
export {};
