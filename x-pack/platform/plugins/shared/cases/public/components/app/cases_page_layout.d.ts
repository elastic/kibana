import React from 'react';
interface CasesPageLayoutProps {
    children: React.ReactNode;
    basePath: string;
}
interface CasesRedesignConfig {
    list: boolean;
    details: boolean;
    settings: boolean;
}
export type CasesPageLayoutVariant = 'legacy' | 'compact' | 'fullHeight';
export interface CasesPageLayoutContextValue {
    variant: CasesPageLayoutVariant;
}
export declare const useCasesPageLayout: () => CasesPageLayoutContextValue;
export declare const getCasesPageLayoutVariant: ({ pathname, basePath, casesRedesign, }: {
    pathname: string;
    basePath: string;
    casesRedesign: CasesRedesignConfig;
}) => CasesPageLayoutVariant;
export declare const CasesPageLayout: {
    ({ children, basePath }: CasesPageLayoutProps): React.JSX.Element;
    displayName: string;
};
export {};
