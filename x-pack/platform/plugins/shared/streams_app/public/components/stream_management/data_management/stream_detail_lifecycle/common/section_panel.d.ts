import React from 'react';
interface SectionPanelProps {
    topCard: React.ReactNode;
    bottomCard: React.ReactNode;
    children: React.ReactNode;
}
export declare const SectionPanel: ({ topCard, bottomCard, children }: SectionPanelProps) => React.JSX.Element;
export {};
