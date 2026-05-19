import React from 'react';
import type { ExpressionsStart } from '@kbn/expressions-plugin/public';
import type { TimeRange } from '@kbn/es-query';
interface AlertEpisodesTagFilterProps {
    selectedTags?: string[] | null;
    onTagsChange: (tags: string[] | undefined) => void;
    services: {
        expressions: ExpressionsStart;
    };
    timeRange: TimeRange;
    'data-test-subj'?: string;
}
export declare function AlertEpisodesTagFilter({ selectedTags, onTagsChange, services, timeRange, 'data-test-subj': dataTestSubj, }: AlertEpisodesTagFilterProps): React.JSX.Element;
export {};
