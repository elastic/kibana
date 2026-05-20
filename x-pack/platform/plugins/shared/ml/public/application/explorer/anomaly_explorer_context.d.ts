import type { PropsWithChildren } from 'react';
import React, { type FC } from 'react';
import { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import { AnomalyChartsStateService } from './anomaly_charts_state_service';
import { AnomalyExplorerChartsService } from '../services/anomaly_explorer_charts_service';
import { AnomalyDetectionAlertsStateService } from './alerts';
import { AnomalyTableStateService } from './anomaly_table_state_service';
import { AnnotationsStateService } from './annotations_state_service';
import { InfluencersStateService } from './influencers_state_service';
export interface AnomalyExplorerContextValue {
    anomalyExplorerChartsService: AnomalyExplorerChartsService;
    anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService;
    anomalyTimelineService: AnomalyTimelineService;
    anomalyTimelineStateService: AnomalyTimelineStateService;
    chartsStateService: AnomalyChartsStateService;
    anomalyDetectionAlertsStateService: AnomalyDetectionAlertsStateService;
    anomalyTableService: AnomalyTableStateService;
    annotationsStateService: AnnotationsStateService;
    influencersStateService: InfluencersStateService;
}
/**
 * Context of the Anomaly Explorer page.
 */
export declare const AnomalyExplorerContext: React.Context<AnomalyExplorerContextValue | undefined>;
/**
 * Hook for consuming {@link AnomalyExplorerContext}.
 */
export declare function useAnomalyExplorerContext(): AnomalyExplorerContextValue;
/**
 * Anomaly Explorer Context Provider.
 */
export declare const AnomalyExplorerContextProvider: FC<PropsWithChildren<unknown>>;
