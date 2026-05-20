import React from 'react';
import type { ErrorMessage } from './types';
export interface CallOutProps {
    handleButtonClick: (e: React.MouseEvent, id: string, type: NonNullable<ErrorMessage['errorType']>) => void;
    id: string;
    messages: ErrorMessage[];
    type: NonNullable<ErrorMessage['errorType']>;
    hasLicenseError: boolean;
}
export declare const CallOut: React.MemoExoticComponent<{
    ({ handleButtonClick, id, messages, type, hasLicenseError, }: CallOutProps): React.JSX.Element | null;
    displayName: string;
}>;
