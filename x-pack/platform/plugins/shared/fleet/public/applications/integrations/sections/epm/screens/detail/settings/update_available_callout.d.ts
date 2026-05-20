import React from 'react';
import { type BreakingChangesLog } from '../utils';
interface UpdateAvailableCalloutProps {
    version: string;
    toggleChangelogModal: () => void;
    breakingChanges: {
        changelog: BreakingChangesLog;
        isUnderstood: boolean;
        toggleIsUnderstood: () => void;
        onOpen: () => void;
    } | null;
}
export declare const UpdateAvailableCallout: ({ version, toggleChangelogModal, breakingChanges, }: UpdateAvailableCalloutProps) => React.JSX.Element;
export {};
