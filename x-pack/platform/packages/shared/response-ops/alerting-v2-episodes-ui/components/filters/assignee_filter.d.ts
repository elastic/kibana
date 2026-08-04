import React from 'react';
interface AlertEpisodesAssigneeFilterProps {
    selectedAssigneeUid?: string;
    onAssigneeChange: (assigneeUid: string | undefined) => void;
    assigneeUids: string[];
    'data-test-subj'?: string;
}
export declare function AlertEpisodesAssigneeFilter({ selectedAssigneeUid, onAssigneeChange, assigneeUids, 'data-test-subj': dataTestSubj, }: AlertEpisodesAssigneeFilterProps): React.JSX.Element;
export {};
