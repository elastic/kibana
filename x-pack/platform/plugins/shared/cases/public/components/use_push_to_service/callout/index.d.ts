import React from 'react';
import type { ErrorMessage } from './types';
export * from './helpers';
export interface CaseCallOutProps {
    hasConnectors: boolean;
    hasLicenseError: boolean;
    messages?: ErrorMessage[];
    onEditClick: () => void;
}
export declare const CaseCallOut: React.MemoExoticComponent<{
    ({ hasConnectors, hasLicenseError, onEditClick, messages, }: CaseCallOutProps): React.JSX.Element;
    displayName: string;
}>;
