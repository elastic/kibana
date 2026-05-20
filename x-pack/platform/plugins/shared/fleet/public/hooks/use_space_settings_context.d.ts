import React from 'react';
export declare const SpaceSettingsContextProvider: React.FC<{
    enabled?: boolean;
    children?: React.ReactNode;
}>;
export declare function useSpaceSettingsContext(): {
    isInitialLoading?: boolean;
    allowedNamespacePrefixes: string[];
    defaultNamespace: string;
};
