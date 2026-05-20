import type { FunctionComponent } from 'react';
import React from 'react';
interface IntegrationsStateContextValue {
    getFromIntegrations(): string | undefined;
}
export declare const IntegrationsStateContextProvider: FunctionComponent<{
    children?: React.ReactNode;
}>;
export declare const useIntegrationsStateContext: () => IntegrationsStateContextValue;
export {};
