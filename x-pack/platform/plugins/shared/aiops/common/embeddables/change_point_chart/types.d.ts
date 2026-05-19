import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { SerializedTimeRange } from '@kbn/presentation-publishing';
import type { SerializedTitles } from '@kbn/presentation-publishing-schemas';
interface ChangePointCommonState extends SerializedTimeRange {
    viewType: ChangePointDetectionViewType;
    fn: 'avg' | 'sum' | 'min' | 'max' | string;
    metricField: string;
    splitField?: string;
    partitions?: string[];
    maxSeriesToPlot?: number;
}
export type ChangePointEmbeddableState = ChangePointCommonState & SerializedTitles & {
    dataViewId: string;
};
export type StoredChangePointEmbeddableState = Omit<ChangePointEmbeddableState, 'dataViewId'>;
export {};
