import type { FC } from 'react';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { AppStateSelectedCells, ExplorerJob } from './explorer_utils';
interface AnomalyContextMenuProps {
    selectedJobs: ExplorerJob[];
    selectedCells?: AppStateSelectedCells | null;
    bounds?: TimeRangeBounds;
    interval?: number;
    chartsCount: number;
    mergedGroupsAndJobsIds: string[];
}
export declare const AnomalyContextMenu: FC<AnomalyContextMenuProps>;
export {};
