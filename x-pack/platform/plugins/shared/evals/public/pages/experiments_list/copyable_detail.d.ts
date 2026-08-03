import React from 'react';
export interface CopyableDetailProps {
    label: string;
    value: string;
    onCopy: (value: string) => void;
    dataTestSubj?: string;
}
export declare const CopyableDetail: React.FC<CopyableDetailProps>;
