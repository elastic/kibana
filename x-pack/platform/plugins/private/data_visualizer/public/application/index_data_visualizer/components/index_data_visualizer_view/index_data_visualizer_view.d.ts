import type { FC } from 'react';
import type { Required } from 'utility-types';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { DataVisualizerIndexBasedAppState } from '../../types/index_data_visualizer_state';
import type { GetAdditionalLinks } from '../../../common/components/results_links';
export declare const getDefaultDataVisualizerListState: (overrides?: Partial<DataVisualizerIndexBasedAppState>) => Required<DataVisualizerIndexBasedAppState>;
export interface IndexDataVisualizerViewProps {
    currentDataView: DataView;
    currentSavedSearch: SavedSearch | null;
    currentSessionId?: string;
    getAdditionalLinks?: GetAdditionalLinks;
}
export declare const IndexDataVisualizerView: FC<IndexDataVisualizerViewProps>;
