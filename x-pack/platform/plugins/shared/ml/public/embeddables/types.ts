/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type BehaviorSubject } from 'rxjs';

import type { CoreStart } from '@kbn/core/public';
import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { MlEntityField } from '@kbn/ml-anomaly-utils';
import type {
  EmbeddableApiContext,
  HasEditCapabilities,
  HasParentApi,
  HasType,
  PublishesUnifiedSearch,
  PublishingSubject,
  PublishesTimeRange,
  PublishesWritableTitle,
  PublishesDataViews,
} from '@kbn/presentation-publishing';
import type { TypeOf } from '@kbn/config-schema';
import type { SeverityThreshold } from '@kbn/ml-common-types/anomalies';
import type { JobId } from '@kbn/ml-common-types/anomaly_detection_jobs/job';
import type {
  AnomalyExplorerChartsEmbeddableType,
  AnomalySwimLaneEmbeddableType,
  MlEmbeddableTypes,
} from '@kbn/ml-embeddables/constants';
import type { MlApi } from '@kbn/ml-services/ml_api_service';
import type { MlCapabilitiesService } from '@kbn/ml-services/capabilities/check_capabilities';
import type { MlFieldFormatService } from '@kbn/ml-services/field_format_service';
import type { MlResultsService } from '@kbn/ml-services/results_service_2';

import type {
  anomalyChartsEmbeddableOverridableStateSchema,
  anomalyChartsEmbeddableRuntimeStateSchema,
  anomalyChartsEmbeddableStateSchema,
} from '../../server/embeddable/schemas';

import type { MlDependencies } from '../application/app';
import type { AppStateSelectedCells } from '../application/explorer/explorer_utils';
import type { AnomalyDetectorService } from '../application/services/anomaly_detector_service';
import type { AnomalyExplorerChartsService } from '../application/services/anomaly_explorer_charts_service';
import type { AnomalyTimelineService } from '../application/services/anomaly_timeline_service';
import type { MlTimeSeriesSearchService } from '../application/timeseriesexplorer/timeseriesexplorer_utils/time_series_search_service';
import type { TimeSeriesExplorerService } from '../application/util/time_series_explorer_service';
import type { ToastNotificationService } from '../application/services/toast_notification_service';

import type {
  SingleMetricViewerEmbeddableState,
  SingleMetricViewerEmbeddableUserInput,
} from './single_metric_viewer/types';

export type {
  AnomalySwimLaneEmbeddableState,
  AnomalySwimLaneEmbeddableApi,
} from './anomaly_swimlane/types';

export type {
  SingleMetricViewerEmbeddableUserInput,
  SingleMetricViewerEmbeddableState,
} from './single_metric_viewer/types';

/**
 * Common API for all ML embeddables
 */
export interface MlEmbeddableBaseApi<StateType extends object = object>
  extends DefaultEmbeddableApi<StateType>,
    PublishesTimeRange {}

export type MlEntity = Record<string, MlEntityField['fieldValue']>;

export interface AnomalySwimlaneServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyTimelineService: AnomalyTimelineService;
}

export type AnomalySwimlaneEmbeddableServices = [
  CoreStart,
  MlDependencies,
  AnomalySwimlaneServices
];

export type EditSwimLaneActionApi = HasType<AnomalySwimLaneEmbeddableType> &
  Partial<HasParentApi<PublishesUnifiedSearch>>;

export interface EditSwimlanePanelContext extends EmbeddableApiContext {
  embeddable: EditSwimLaneActionApi;
}

export interface SwimLaneDrilldownContext extends EditSwimlanePanelContext {
  /**
   * Optional data provided by swim lane selection
   */
  data?: AppStateSelectedCells;
}

/**
 * Anomaly Explorer Charts
 */

export type AnomalyChartsEmbeddableRuntimeState = TypeOf<
  typeof anomalyChartsEmbeddableRuntimeStateSchema
>;
export type AnomalyChartsEmbeddableOverridableState = TypeOf<
  typeof anomalyChartsEmbeddableOverridableStateSchema
>;
export interface AnomalyChartsComponentApi {
  jobIds$: PublishingSubject<JobId[]>;
  maxSeriesToPlot$: PublishingSubject<number>;
  severityThreshold$: PublishingSubject<SeverityThreshold[]>;
  selectedEntities$: PublishingSubject<MlEntityField[] | undefined>;
  updateUserInput: (input: AnomalyChartsEmbeddableOverridableState) => void;
  updateSeverityThreshold: (v?: SeverityThreshold[]) => void;
  updateSelectedEntities: (entities?: MlEntityField[] | undefined) => void;
}
export interface AnomalyChartsDataLoadingApi {
  onRenderComplete: () => void;
  onLoading: (v: boolean) => void;
  onError: (error?: Error) => void;
}

/**
 * Persisted state for the Anomaly Charts Embeddable.
 */
export type AnomalyChartsEmbeddableState = TypeOf<typeof anomalyChartsEmbeddableStateSchema>;

export type AnomalyChartsApi = AnomalyChartsComponentApi & AnomalyChartsDataLoadingApi;

export type AnomalyChartsEmbeddableApi = MlEmbeddableBaseApi<AnomalyChartsEmbeddableState> &
  PublishesDataViews &
  PublishesWritableTitle &
  HasEditCapabilities &
  AnomalyChartsApi;

export interface AnomalyChartsFieldSelectionApi {
  jobIds: PublishingSubject<JobId[]>;
  entityFields: PublishingSubject<MlEntityField[] | undefined>;
}

export interface AnomalyChartsAttachmentState extends AnomalyChartsEmbeddableState {
  query?: Query;
  filters?: Filter[];
}

export interface AnomalyChartsAttachmentApi extends AnomalyChartsApi {
  parentApi: {
    query$: BehaviorSubject<Query | undefined>;
    filters$: BehaviorSubject<Filter[] | undefined>;
    timeRange$: BehaviorSubject<TimeRange | undefined>;
  };
}

/**
 * Persisted state for the Single Metric Embeddable.
 */
export type SingleMetricViewerEmbeddableApi =
  MlEmbeddableBaseApi<SingleMetricViewerEmbeddableState> &
    PublishesWritableTitle &
    HasEditCapabilities &
    SingleMetricViewerComponentApi;

/**
 * The subset of the single metric viewer Embeddable state that is actually used by the single metric viewer embeddable.
 *
 * TODO: Ideally this should be the same as the SingleMetricViewerEmbeddableState, but that type is used in many
 * places, so we cannot change it at the moment.
 */
export type SingleMetricViewerRuntimeState = Omit<
  SingleMetricViewerEmbeddableState,
  'id' | 'filters' | 'query' | 'refreshConfig' | 'forecastId'
>;

export interface SingleMetricViewerComponentApi {
  forecastId: PublishingSubject<string | undefined>;
  functionDescription: PublishingSubject<string | undefined>;
  jobIds: PublishingSubject<JobId[]>;
  selectedDetectorIndex: PublishingSubject<number>;
  selectedEntities: PublishingSubject<MlEntity | undefined>;

  updateUserInput: (input: SingleMetricViewerEmbeddableUserInput) => void;
  updateForecastId: (id: string | undefined) => void;
}

export interface AnomalyChartsServices {
  anomalyDetectorService: AnomalyDetectorService;
  anomalyExplorerService: AnomalyExplorerChartsService;
  mlCapabilities: MlCapabilitiesService;
  mlFieldFormatService: MlFieldFormatService;
  mlResultsService: MlResultsService;
  mlApi: MlApi;
}

export interface SingleMetricViewerServices {
  anomalyExplorerService: AnomalyExplorerChartsService;
  anomalyDetectorService: AnomalyDetectorService;
  mlApi: MlApi;
  mlCapabilities: MlCapabilitiesService;
  mlFieldFormatService: MlFieldFormatService;
  mlResultsService: MlResultsService;
  mlTimeSeriesSearchService?: MlTimeSeriesSearchService;
  mlTimeSeriesExplorerService?: TimeSeriesExplorerService;
  toastNotificationService?: ToastNotificationService;
}

export type AnomalyChartsEmbeddableServices = [CoreStart, MlDependencies, AnomalyChartsServices];
export type SingleMetricViewerEmbeddableServices = [
  CoreStart,
  MlDependencies,
  SingleMetricViewerServices
];
export interface EditAnomalyChartsPanelContext {
  embeddable: AnomalyChartsEmbeddableApi;
}

export interface AnomalyChartsFieldSelectionContext extends EditAnomalyChartsPanelContext {
  /**
   * Optional fields selected using anomaly charts
   */
  data?: MlEntityField[];
}

export type MappedEmbeddableTypeOf<TEmbeddableType extends MlEmbeddableTypes> =
  TEmbeddableType extends AnomalyExplorerChartsEmbeddableType
    ? AnomalyChartsEmbeddableState
    : unknown;
