export const FORECAST_DURATION_MAX_DAYS: 3650;
export class ForecastingModal extends React.Component<any, any, any> {
    static propTypes: {
        buttonMode: PropTypes.Requireable<string>;
        isDisabled: PropTypes.Requireable<boolean>;
        job: PropTypes.Requireable<object>;
        jobState: PropTypes.Requireable<string>;
        detectorIndex: PropTypes.Requireable<number>;
        earliestRecordTimestamp: PropTypes.Requireable<number>;
        latestRecordTimestamp: PropTypes.Requireable<number>;
        entities: PropTypes.Requireable<any[]>;
        setForecastId: PropTypes.Requireable<(...args: any[]) => any>;
        selectedForecastId: PropTypes.Requireable<string>;
    };
    /**
     * Access ML services in react context.
     */
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    constructor(props: any);
    state: {
        isModalVisible: boolean;
        previousForecasts: never[];
        isForecastRequested: boolean;
        forecastProgress: number;
        jobOpeningState: number;
        jobClosingState: number;
        newForecastDuration: string;
        isNewForecastDurationValid: boolean;
        newForecastDurationErrors: never[];
        neverExpires: boolean;
        messages: never[];
    };
    forecastChecker: any;
    componentDidMount(): void;
    mlForecastService: {
        getForecastsSummary: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, query: any, earliestMs: number, maxResults: any) => Promise<unknown>;
        getForecastDateRange: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, forecastId: string) => Promise<{
            success: boolean;
            earliest: number | null;
            latest: number | null;
        }>;
        getForecastData: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, detectorIndex: number, forecastId: string, entityFields: any, earliestMs: number, latestMs: number, intervalMs: number, aggType?: import("../../../services/forecast_service").AggType) => import("rxjs").Observable<{
            success: boolean;
            results: Record<number, any>;
        }>;
        runForecast: (jobId: string, duration?: string, neverExpires?: boolean) => Promise<unknown>;
        getForecastRequestStats: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, forecastId: string) => Promise<unknown>;
    } | undefined;
    addMessage: (message: any, status: any, clearFirst?: boolean) => void;
    viewForecast: (forecastId: any) => void;
    onNeverExpiresChange: (event: any) => void;
    onNewForecastDurationChange: (event: any) => void;
    checkJobStateAndRunForecast: () => void;
    openJobAndRunForecast: () => void;
    runForecastErrorHandler: (resp: any, closeJob: any) => void;
    runForecast: (closeJobAfterRunning: any) => void;
    waitForForecastResults: (forecastId: any, closeJobAfterRunning: any) => void;
    openModal: () => void;
    closeAfterRunningForecast: () => void;
    closeModal: () => void;
    render(): React.JSX.Element;
}
import React from 'react';
import PropTypes from 'prop-types';
