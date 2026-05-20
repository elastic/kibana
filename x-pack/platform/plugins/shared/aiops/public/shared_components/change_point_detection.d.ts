import type { ChangePointDetectionViewType } from '@kbn/aiops-change-point-detection/constants';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { TimeRange } from '@kbn/es-query';
import React, { type FC } from 'react';
import type { PublishesFilters } from '@kbn/presentation-publishing';
import { type ChangePointAnnotation } from '../components/change_point_detection/change_point_detection_context';
import type { AiopsPluginStartDeps } from '../types';
/**
 * Only used to initialize internally
 */
export type ChangePointDetectionPropsWithDeps = ChangePointDetectionProps & {
    coreStart: CoreStart;
    pluginStart: AiopsPluginStartDeps;
};
export type ChangePointDetectionSharedComponent = FC<ChangePointDetectionProps>;
export interface ChangePointDetectionProps {
    viewType?: ChangePointDetectionViewType;
    dataViewId: string;
    timeRange: TimeRange;
    fn: 'avg' | 'sum' | 'min' | 'max' | string;
    metricField: string;
    splitField?: string;
    partitions?: string[];
    maxSeriesToPlot?: number;
    /**
     * Component to render if there are no change points found
     */
    emptyState?: React.ReactElement;
    /**
     * Outputs the most recent change point data
     */
    onChange?: (changePointData: ChangePointAnnotation[]) => void;
    /**
     * Last reload request time, can be used for manual reload
     */
    lastReloadRequestTime?: number;
    /** Origin of the embeddable instance */
    embeddingOrigin?: string;
    onLoading: (isLoading: boolean) => void;
    onRenderComplete: () => void;
    onError: (error: Error) => void;
    filtersApi?: PublishesFilters;
}
declare const ChangePointDetectionWrapper: FC<ChangePointDetectionPropsWithDeps>;
export default ChangePointDetectionWrapper;
