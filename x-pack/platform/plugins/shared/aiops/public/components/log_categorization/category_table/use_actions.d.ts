import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
import type { Filter } from '@kbn/es-query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
import type { LogCategorizationAppState } from '../../../application/url_state/log_pattern_analysis';
import type { OpenInDiscover } from './use_open_in_discover';
export interface UseActions {
    getActions: (navigateToDiscover: boolean) => Array<Action<Category>>;
    openInDiscover: OpenInDiscover;
}
export declare function useActions(dataViewId: string, selectedField: DataViewField | string | undefined, selectedCategories: Category[], aiopsListState: LogCategorizationAppState, timefilter: TimefilterContract, onAddFilter?: (values: Filter, alias?: string) => void, additionalFilter?: CategorizationAdditionalFilter, onClose?: () => void): UseActions;
