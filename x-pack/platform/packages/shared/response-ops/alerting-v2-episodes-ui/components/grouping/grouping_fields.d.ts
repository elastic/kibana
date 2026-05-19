import React from 'react';
export interface AlertEpisodeGroupingFieldsProps {
    /** Field names from the rule's grouping configuration */
    fields: string[];
    'data-test-subj'?: string;
}
export declare function AlertEpisodeGroupingFields({ fields, 'data-test-subj': dataTestSubj, }: AlertEpisodeGroupingFieldsProps): React.JSX.Element;
