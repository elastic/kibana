import React from 'react';
interface HeaderProps {
    border?: boolean;
    isLoading?: boolean;
}
export interface HeaderPageProps extends HeaderProps {
    children?: React.ReactNode;
    title: string | React.ReactNode;
    titleNode?: React.ReactElement;
    incrementalId?: number | null;
    'data-test-subj'?: string;
}
export declare const HeaderPage: React.NamedExoticComponent<HeaderPageProps>;
export {};
