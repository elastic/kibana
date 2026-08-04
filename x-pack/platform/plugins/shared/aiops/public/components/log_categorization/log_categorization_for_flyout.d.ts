import type { FC } from 'react';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/public';
import type { CategorizationAdditionalFilter } from '@kbn/aiops-log-pattern-analysis/create_category_request';
export interface LogCategorizationPageProps {
    dataView: DataView;
    savedSearch: SavedSearch | null;
    selectedField: DataViewField;
    onClose: () => void;
    additionalFilter?: CategorizationAdditionalFilter;
}
export declare const LogCategorizationFlyout: FC<LogCategorizationPageProps>;
