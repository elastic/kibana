import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import type { Filter } from '@kbn/es-query';
import { type QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { AiOpsIndexBasedAppState } from '../../application/url_state/common';
export declare function useDiscoverLinks(): {
    openInDiscoverWithFilter: (index: string, field: string, selection: Category[], aiopsListState: Required<AiOpsIndexBasedAppState>, timefilterActiveBounds: TimeRangeBounds, mode: QueryMode, category?: Category, additionalField?: {
        name: string;
        value: string;
    }) => void;
};
export declare function createFilter(index: string, field: string, selection: Category[], mode: QueryMode, category?: Category, additionalField?: {
    name: string;
    value: string;
}): Filter;
