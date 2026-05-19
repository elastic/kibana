import React from 'react';
import type { CaseUI } from '../../../../common';
import type { UseCopyIDActionProps } from '../types';
export declare const useCopyIDAction: ({ onActionSuccess }: UseCopyIDActionProps) => {
    getAction: (selectedCase: CaseUI) => {
        name: React.JSX.Element;
        onClick: () => void;
        'data-test-subj': string;
        icon: React.JSX.Element;
        key: string;
    };
};
export type UseCopyIDAction = ReturnType<typeof useCopyIDAction>;
