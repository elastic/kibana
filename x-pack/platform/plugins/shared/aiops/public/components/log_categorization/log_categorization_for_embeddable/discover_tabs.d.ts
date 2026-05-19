import type { FC } from 'react';
import React from 'react';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField, DataView } from '@kbn/data-views-plugin/common';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { OpenInDiscover } from '../category_table/use_open_in_discover';
import type { RandomSampler } from '../sampling_menu';
import type { MinimumTimeRangeOption } from '../../../../common/embeddables/pattern_analysis/types';
interface Props {
    renderViewModeToggle: (patternCount?: number) => React.ReactElement;
    randomSampler: RandomSampler;
    openInDiscover: OpenInDiscover;
    selectedCategories: Category[];
    loadCategories: () => void;
    fields: DataViewField[];
    setSelectedField: React.Dispatch<React.SetStateAction<DataViewField | null>>;
    selectedField: DataViewField | null;
    minimumTimeRangeOption: MinimumTimeRangeOption;
    setMinimumTimeRangeOption: (w: MinimumTimeRangeOption) => void;
    dataview: DataView;
    earliest: number | undefined;
    latest: number | undefined;
    query: QueryDslQueryContainer;
    data: {
        categories: Category[];
        displayExamples: boolean;
        totalCategories: number;
    } | null;
}
export declare const DiscoverTabs: FC<Props>;
export {};
