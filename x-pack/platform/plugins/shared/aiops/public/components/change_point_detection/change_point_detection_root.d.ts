import type { FC } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { AiopsAppContextValue } from '../../hooks/use_aiops_app_context';
/**
 * Props for the ChangePointDetectionAppState component.
 */
export interface ChangePointDetectionAppStateProps {
    /** The data view to analyze. */
    dataView: DataView;
    /** The saved search to analyze. */
    savedSearch: SavedSearch | null;
    /** App context value */
    appContextValue: AiopsAppContextValue;
    /** Optional flag to indicate whether kibana is running in serverless */
    showFrozenDataTierChoice?: boolean;
}
export declare const ChangePointDetectionAppState: FC<ChangePointDetectionAppStateProps>;
