import React from 'react';
interface MitigationAccordionProps {
    title: string;
    isLoading: boolean;
    dataTestSubjPrefix: string;
    children: React.ReactNode;
    initialIsOpen?: boolean;
}
export declare function MitigationAccordion({ title, isLoading, dataTestSubjPrefix, children, initialIsOpen, }: MitigationAccordionProps): React.JSX.Element;
export {};
