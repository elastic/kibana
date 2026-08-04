import React from 'react';
interface AlertEpisodesSeverityFilterProps {
    selectedSeverities?: string[] | null;
    onSeveritiesChange: (severities: string[] | undefined) => void;
    'data-test-subj'?: string;
}
export declare function AlertEpisodesSeverityFilter({ selectedSeverities, onSeveritiesChange, 'data-test-subj': dataTestSubj, }: AlertEpisodesSeverityFilterProps): React.JSX.Element;
export {};
