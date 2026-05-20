import React from 'react';
export interface SpaceSelectorProps {
    value: string[];
    onChange: (newVal: string[]) => void;
    isDisabled?: boolean;
    setInvalidSpaceError?: (hasError: boolean) => void;
}
export declare const SpaceSelector: React.FC<SpaceSelectorProps>;
export declare const SpaceSelectorComponent: React.FC<SpaceSelectorProps>;
