export class TimeSeriesExplorerEmbeddableChart extends React.Component<any, any, any> {
    static propTypes: {
        api: PropTypes.Requireable<object>;
        appStateHandler: PropTypes.Validator<(...args: any[]) => any>;
        autoZoomDuration: PropTypes.Validator<number>;
        bounds: PropTypes.Validator<object>;
        chartWidth: PropTypes.Validator<number>;
        chartHeight: PropTypes.Requireable<number>;
        lastRefresh: PropTypes.Validator<number>;
        onRenderComplete: PropTypes.Requireable<(...args: any[]) => any>;
        previousRefresh: PropTypes.Validator<number>;
        selectedJob: PropTypes.Validator<object>;
        selectedJobStats: PropTypes.Validator<object>;
        selectedJobId: PropTypes.Validator<string>;
        selectedDetectorIndex: PropTypes.Requireable<number>;
        selectedEntities: PropTypes.Requireable<object>;
        selectedForecastId: PropTypes.Requireable<string>;
        tableInterval: PropTypes.Requireable<string>;
        tableSeverity: PropTypes.Requireable<NonNullable<number | object | null | undefined>>;
        zoom: PropTypes.Requireable<object>;
        toastNotificationService: PropTypes.Requireable<object>;
        dataViewsService: PropTypes.Requireable<object>;
        onForecastComplete: PropTypes.Requireable<(...args: any[]) => any>;
    };
    /**
     * Access ML services in react context.
     */
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    constructor(props: any);
    constructor(props: any, context: any);
    state: {
        chartDetails: undefined;
        contextAggregationInterval: undefined;
        contextChartData: undefined;
        contextForecastData: undefined;
        dataNotChartable: boolean;
        entitiesLoading: boolean;
        entityValues: {};
        focusAnnotationData: never[];
        focusAggregationInterval: {};
        focusChartData: undefined;
        focusForecastData: undefined;
        fullRefresh: boolean;
        hasResults: boolean;
        loadCounter: number;
        loading: boolean;
        modelPlotEnabled: boolean;
        showAnnotations: boolean;
        showAnnotationsCheckbox: boolean;
        showForecast: boolean;
        showForecastCheckbox: boolean;
        showModelBounds: boolean;
        showModelBoundsCheckbox: boolean;
        svgWidth: number;
        tableData: undefined;
        zoomFrom: undefined;
        zoomTo: undefined;
        zoomFromFocusLoaded: undefined;
        zoomToFocusLoaded: undefined;
        chartDataError: undefined;
        sourceIndicesWithGeoFields: {};
    };
    subscriptions: Subscription;
    unmounted: boolean;
    /**
     * Subject for listening brush time range selection.
     */
    contextChart$: Subject<any>;
    /**
     * When false, skips anomalies table fetches in the brush → focus pipeline.
     */
    includeAnomaliesTable: boolean;
    contextLoadAbortController: any;
    getBoundsRoundedToInterval: any;
    mlTimeSeriesExplorer: any;
    mlForecastService: any;
    /**
     * Returns field names that don't have a selection yet.
     */
    getFieldNamesWithEmptyValues: () => string[];
    /**
     * Checks if all entity control dropdowns have a selection.
     */
    arePartitioningFieldsProvided: () => boolean;
    toggleShowAnnotationsHandler: () => void;
    toggleShowForecastHandler: () => void;
    toggleShowModelBoundsHandler: () => void;
    setFunctionDescription: (selectedFuction: any) => void;
    previousChartProps: {};
    previousShowAnnotations: undefined;
    previousShowForecast: undefined;
    previousShowModelBounds: undefined;
    tableFilter: (field: any, value: any, operator: any) => void;
    contextChartSelectedInitCallDone: boolean;
    getFocusAggregationInterval(selection: any): any;
    /**
     * Gets focus data for the current component state
     */
    getFocusData(selection: any): any;
    contextChartSelected: (selection: any) => void;
    loadAnomaliesTableData: (earliestMs: any, latestMs: any) => import("rxjs").Observable<{
        tableData: {
            anomalies: unknown[];
            interval: unknown;
            examplesByJobId: unknown;
            showViewSeriesLink: boolean;
        };
    }>;
    setForecastId: (forecastId: any) => void;
    displayErrorToastMessages: (error: any, errorMsg: any) => void;
    loadSingleMetricData: (fullRefresh?: boolean) => void;
    previousSelectedForecastId: any;
    /**
     * Updates local state of detector related controls from the global state.
     * @param callback to invoke after a state update.
     */
    getControlsForDetector: () => import("../components/entity_control/entity_control").Entity[];
    /**
     * Updates criteria fields for API calls, e.g. getAnomaliesTableData
     * @param detectorIndex
     * @param entities
     */
    getCriteriaFields(detectorIndex: any, entities: any): import("@kbn/ml-common-types/results").CriteriaField[];
    componentDidMount(): Promise<void>;
    mlJobService: import("../../services/job_service").MlJobService | undefined;
    componentDidUpdate(previousProps: any): void;
    componentWillUnmount(): void;
    render(): React.JSX.Element;
}
import React from 'react';
import type { Subscription } from 'rxjs';
import type { Subject } from 'rxjs';
import type PropTypes from 'prop-types';
