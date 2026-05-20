import React from 'react';
import type { ExecutionContextStart } from '@kbn/core/public';
export interface Context {
    isCloudEnabled: boolean;
    cloudBaseUrl: string;
    cloudDeploymentUrl: string;
    executionContext: ExecutionContextStart;
    canUseAPIKeyTrustModel: boolean;
}
export declare const AppContext: React.Context<Context>;
export declare const AppContextProvider: ({ children, context, }: {
    children: React.ReactNode;
    context: Context;
}) => React.JSX.Element;
export declare const useAppContext: () => Context;
