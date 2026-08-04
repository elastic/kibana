import React from 'react';
interface AlertEpisodesStatusFilterProps {
    selectedStatuses?: string[] | null;
    onStatusesChange: (statuses: string[] | undefined) => void;
    'data-test-subj'?: string;
}
export declare function AlertEpisodesStatusFilter({ selectedStatuses, onStatusesChange, 'data-test-subj': dataTestSubj, }: AlertEpisodesStatusFilterProps): React.JSX.Element;
export {};
