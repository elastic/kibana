import type { EuiButtonProps, EuiLinkProps, PropsForAnchor, PropsForButton } from '@elastic/eui';
import React from 'react';
export interface CasesNavigation<T = React.MouseEvent | MouseEvent | null, K = null> {
    href?: K extends 'configurable' ? (arg: T) => string : string;
    onClick: K extends 'configurable' ? (arg: T, arg2: React.MouseEvent | MouseEvent) => Promise<void> | void : (arg: T) => Promise<void> | void;
}
type LinkButtonProps = React.FC<(PropsForButton<EuiButtonProps> | PropsForAnchor<EuiButtonProps>) & {
    isEmpty?: boolean;
}>;
export declare const LinkButton: LinkButtonProps;
export declare const LinkAnchor: React.FC<EuiLinkProps>;
export interface CaseDetailsLinkProps {
    children?: React.ReactNode;
    detailName: string;
    title?: string;
}
export declare const CaseDetailsLink: React.NamedExoticComponent<CaseDetailsLinkProps>;
export interface ConfigureCaseButtonProps {
    label: string;
    msgTooltip: JSX.Element;
    showToolTip: boolean;
    titleTooltip: string;
}
export declare const ConfigureCaseButton: React.NamedExoticComponent<ConfigureCaseButtonProps>;
export {};
