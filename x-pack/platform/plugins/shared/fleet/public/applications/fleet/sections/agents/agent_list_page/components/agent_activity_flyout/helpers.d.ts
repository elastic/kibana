import React from 'react';
import type { ActionStatus } from '../../../../../types';
export declare const getAction: (type?: string, actionId?: string) => {
    inProgressText: string;
    completedText: string;
    cancelledText: string;
};
export declare const inProgressTitle: (action: ActionStatus, isAutomatic: boolean | undefined) => React.JSX.Element;
export declare const inProgressDescription: (time?: string) => React.JSX.Element;
export declare const formattedTime: (time?: string) => React.JSX.Element | null;
