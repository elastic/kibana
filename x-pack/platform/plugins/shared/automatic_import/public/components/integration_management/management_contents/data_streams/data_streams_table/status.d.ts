import React from 'react';
import type { DataStreamResponse } from '../../../../../../common';
interface StatusProps {
    status: DataStreamResponse['status'];
    isDeleting?: boolean;
}
export declare const Status: {
    ({ status, isDeleting }: StatusProps): React.JSX.Element;
    displayName: string;
};
export {};
