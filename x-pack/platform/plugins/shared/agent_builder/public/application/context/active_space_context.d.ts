import React from 'react';
/**
 * Synchronous accessor for the active space ID. Set by ActiveSpaceProvider on
 * mount. Use this only from non-React call sites — React components should use
 * useActiveSpaceId() instead.
 */
export declare const getResolvedSpaceId: () => string;
export declare const useActiveSpaceId: () => string;
interface ActiveSpaceProviderProps {
    spaceId: string;
    children: React.ReactNode;
}
export declare const ActiveSpaceProvider: React.FC<ActiveSpaceProviderProps>;
export {};
