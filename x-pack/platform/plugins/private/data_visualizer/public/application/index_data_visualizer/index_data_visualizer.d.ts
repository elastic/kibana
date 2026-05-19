import type { FC } from 'react';
import { type IndexDataVisualizerViewProps } from './components/index_data_visualizer_view';
import type { GetAdditionalLinks } from '../common/components/results_links';
import { type IndexDataVisualizerLocatorParams } from './locator';
export interface DataVisualizerStateContextProviderProps {
    IndexDataVisualizerComponent: FC<IndexDataVisualizerViewProps>;
    getAdditionalLinks?: GetAdditionalLinks;
}
export type IndexDataVisualizerSpec = typeof IndexDataVisualizer;
export declare const getLocatorParams: (params: {
    dataViewId?: string;
    savedSearchId?: string;
    urlSearchString: string;
    searchSessionId?: string;
    shouldRestoreSearchSession: boolean;
}) => IndexDataVisualizerLocatorParams;
export interface Props {
    getAdditionalLinks?: GetAdditionalLinks;
    showFrozenDataTierChoice?: boolean;
    esql?: boolean;
}
export declare const IndexDataVisualizer: FC<Props>;
