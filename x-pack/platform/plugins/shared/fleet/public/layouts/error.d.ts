import React from 'react';
export declare const ErrorLayout: React.FunctionComponent<{
    children: React.ReactNode;
    isAddIntegrationsPath: boolean;
}>;
export declare const PermissionsError: React.FunctionComponent<{
    error: string;
    requiredFleetRole?: string;
    callingApplication: string;
}>;
