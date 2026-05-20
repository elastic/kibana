import React from 'react';
export interface AlertingEpisodeGroupingTagsProps {
    fields: readonly string[];
    data: Record<string, unknown>;
    'data-test-subj'?: string;
}
/**
 * Hollow badges for rule grouping field **values** (from parsed episode `data`).
 * Each badge shows the value only (CSS ellipsis); popover shows **field**: value.
 */
export declare function AlertingEpisodeGroupingTags({ fields, data, 'data-test-subj': dataTestSubj, }: AlertingEpisodeGroupingTagsProps): React.JSX.Element | null;
