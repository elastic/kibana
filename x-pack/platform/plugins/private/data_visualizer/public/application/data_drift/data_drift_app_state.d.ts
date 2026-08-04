import type { FC } from 'react';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
export interface DataDriftDetectionAppStateProps {
    /** The data view to analyze. */
    dataView: DataView;
    /** The saved search to analyze. */
    savedSearch: SavedSearch | null;
}
export type DataDriftSpec = typeof DataDriftDetectionAppState;
export declare const DataDriftDetectionAppState: FC<DataDriftDetectionAppStateProps>;
