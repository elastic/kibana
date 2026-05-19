import { type QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import type { Filter } from '@kbn/es-query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { LogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';
import { getLabels } from './labels';
export interface OpenInDiscover {
    openFunction: (mode: QueryMode, navigateToDiscover: boolean, category?: Category) => void;
    getLabels: (navigateToDiscover: boolean) => ReturnType<typeof getLabels>;
    count: number;
}
export declare function useOpenInDiscover(dataViewId: string, selectedField: DataViewField | string | undefined, selectedCategories: Category[], aiopsListState: LogCategorizationAppState, timefilter: TimefilterContract, onAddFilter?: (values: Filter, alias?: string) => void, additionalFilter?: CategorizationAdditionalFilter, onClose?: () => void): OpenInDiscover;
