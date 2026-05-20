import React from 'react';
import type { HeaderProps } from '../components';
export interface WithHeaderLayoutProps extends HeaderProps {
    restrictWidth?: number;
    restrictHeaderWidth?: number;
    'data-test-subj'?: string;
    children?: React.ReactNode;
    isReadOnly?: boolean;
    noSpacerInContent?: boolean;
}
export declare const WithHeaderLayout: React.FC<WithHeaderLayoutProps>;
