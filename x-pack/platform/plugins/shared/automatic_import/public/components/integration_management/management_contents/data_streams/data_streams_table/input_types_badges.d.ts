import React from 'react';
import type { DataStreamResponse } from '../../../../../../common';
interface InputTypesBadgesProps {
    inputTypes: DataStreamResponse['inputTypes'];
}
export declare const InputTypesBadges: {
    ({ inputTypes }: InputTypesBadgesProps): React.JSX.Element | null;
    displayName: string;
};
export {};
