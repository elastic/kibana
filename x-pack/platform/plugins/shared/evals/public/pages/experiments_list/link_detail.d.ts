import React from 'react';
export interface LinkDetailProps {
    label: string;
    href: string;
    text: string;
    dataTestSubj?: string;
}
export declare const LinkDetail: React.FC<LinkDetailProps>;
