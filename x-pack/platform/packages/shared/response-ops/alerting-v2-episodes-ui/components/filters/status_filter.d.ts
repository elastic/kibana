import React from 'react';
interface AlertEpisodesStatusFilterProps {
    selectedStatus?: string | null;
    onStatusChange: (status: string | undefined) => void;
    'data-test-subj'?: string;
}
export declare function AlertEpisodesStatusFilter({ selectedStatus, onStatusChange, 'data-test-subj': dataTestSubj, }: AlertEpisodesStatusFilterProps): React.JSX.Element;
export {};
