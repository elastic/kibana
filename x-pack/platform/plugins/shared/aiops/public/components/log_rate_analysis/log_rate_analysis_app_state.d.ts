import type { FC } from 'react';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { AiopsAppContextValue } from '../../hooks/use_aiops_app_context';
/**
 * Props for the LogRateAnalysisAppState component.
 */
export interface LogRateAnalysisAppStateProps {
    /** The data view to analyze. */
    dataView: DataView;
    /** The saved search to analyze. */
    savedSearch: SavedSearch | null;
    /** App context value */
    appContextValue: AiopsAppContextValue;
    /** Optional flag to indicate whether to show contextual insights */
    showContextualInsights?: boolean;
    /** Optional flag to indicate whether kibana is running in serverless */
    showFrozenDataTierChoice?: boolean;
}
export declare const LogRateAnalysisAppState: FC<LogRateAnalysisAppStateProps>;
