import type { FC } from 'react';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeBuckets } from '@kbn/ml-time-buckets';
import type { SeverityThreshold } from '@kbn/ml-server-schemas/embeddables/anomaly_charts';
import type { OverallSwimlaneData, AppStateSelectedCells } from './explorer_utils';
interface ExplorerUIProps {
    severity: SeverityThreshold[];
    showCharts: boolean;
    selectedJobsRunning: boolean;
    overallSwimlaneData: OverallSwimlaneData | null;
    stoppedPartitions?: string[];
    timefilter: TimefilterContract;
    timeBuckets: TimeBuckets;
    selectedCells: AppStateSelectedCells | undefined | null;
    swimLaneSeverity?: SeverityThreshold[];
    noInfluencersConfigured?: boolean;
}
export declare function getDefaultPanelsState(): {
    topInfluencers: {
        isCollapsed: boolean;
        size: number;
    };
    mainPage: {
        isCollapsed: boolean;
        size: number;
    };
};
export declare const Explorer: FC<ExplorerUIProps>;
export {};
