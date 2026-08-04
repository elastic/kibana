import type { PropsWithChildren } from 'react';
import React from 'react';
import type { CasesActionContextProps, Services } from './types';
export declare const DEFAULT_DARK_MODE: "theme:darkMode";
type ActionWrapperComponentProps = PropsWithChildren<{
    casesActionContextProps: CasesActionContextProps;
    currentAppId?: string;
    services: Services;
}>;
export declare const ActionWrapper: React.NamedExoticComponent<ActionWrapperComponentProps>;
export {};
