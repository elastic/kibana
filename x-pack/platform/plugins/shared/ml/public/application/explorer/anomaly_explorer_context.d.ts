import type { PropsWithChildren } from 'react';
import React, { type FC } from 'react';
import type { AnomalyTimelineStateService } from './anomaly_timeline_state_service';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import type { AnomalyChartsStateService } from './anomaly_charts_state_service';
import type { AnomalyExplorerChartsService } from '../services/anomaly_explorer_charts_service';
import type { AnomalyDetectionAlertsStateService } from './alerts';
import type { AnomalyTableStateService } from './anomaly_table_state_service';
import type { AnnotationsStateService } from './annotations_state_service';
import type { InfluencersStateService } from './influencers_state_service';
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
