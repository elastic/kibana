import type { FC } from 'react';
import type { HeatmapStyle } from '@elastic/charts';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import type { SwimlaneType } from '@kbn/ml-server-schemas/embeddables/anomaly_swimlane';
import type { TimeBuckets as TimeBucketsClass } from '@kbn/ml-time-buckets';
import type { AppStateSelectedCells, OverallSwimlaneData, ViewBySwimLaneData } from './explorer_utils';
declare global {
    interface Window {
        /**
         * Flag used to enable debugState on elastic charts
         */
        _echDebugStateFlag?: boolean;
    }
}
export declare const CELL_HEIGHT = 30;
export declare function isViewBySwimLaneData(arg: any): arg is ViewBySwimLaneData;
export interface SwimlaneProps {
    filterActive?: boolean;
    timeBuckets: InstanceType<typeof TimeBucketsClass>;
    showLegend?: boolean;
    swimlaneData: OverallSwimlaneData | ViewBySwimLaneData;
    swimlaneType: SwimlaneType;
    selection?: AppStateSelectedCells | null;
    onCellsSelection?: (payload?: AppStateSelectedCells) => void;
    'data-test-subj'?: string;
    onResize: (width: number) => void;
    fromPage?: number;
    perPage?: number;
    swimlaneLimit?: number;
    onPaginationChange?: (arg: {
        perPage?: number;
        fromPage?: number;
    }) => void;
    isLoading: boolean;
    noDataWarning: string | JSX.Element | null;
    /**
     * Unique id of the chart
     */
    id: string;
    /**
     * Enables/disables timeline on the X-axis.
     */
    showTimeline?: boolean;
    showYAxis?: boolean;
    yAxisWidth?: HeatmapStyle['yAxisLabel']['width'];
    chartsService: ChartsPluginStart;
    onRenderComplete?: () => void;
}
/**
 * Anomaly swim lane container responsible for handling resizing, pagination and
 * providing swim lane vis with required props.
 */
export declare const SwimlaneContainer: FC<SwimlaneProps>;
