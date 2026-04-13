import React from 'react';
interface InfoPanelProps {
    title: string;
    headerRightContent?: React.ReactNode;
    children: React.ReactNode;
}
export declare function InfoPanel({ title, headerRightContent, children }: InfoPanelProps): React.JSX.Element;
export {};
