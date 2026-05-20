/**
 * Table component for rendering the lists of forecasts run on an ML job.
 */
export class ForecastsTable extends React.Component<any, any, any> {
    /**
     * Access ML services in react context.
     */
    static contextType: React.Context<import("@kbn/kibana-react-plugin/public").KibanaReactContextValue<Partial<import("@kbn/core/public").CoreStart>>>;
    constructor(props: any, constructorContext: any);
    state: {
        isLoading: boolean;
        forecasts: never[];
        forecastIdToDelete: undefined;
    };
    mlForecastService: {
        getForecastsSummary: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, query: any, earliestMs: number, maxResults: any) => Promise<unknown>;
        getForecastDateRange: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, forecastId: string) => Promise<{
            success: boolean;
            earliest: number | null;
            latest: number | null;
        }>;
        getForecastData: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, detectorIndex: number, forecastId: string, entityFields: any, earliestMs: number, latestMs: number, intervalMs: number, aggType?: import("../../../../../services/forecast_service").AggType) => import("rxjs").Observable<{
            success: boolean;
            results: Record<number, any>;
        }>;
        runForecast: (jobId: string, duration?: string, neverExpires?: boolean) => Promise<unknown>;
        getForecastRequestStats: (job: import("@kbn/ml-common-types/anomaly_detection_jobs/job").Job, forecastId: string) => Promise<unknown>;
    };
    componentDidMount(): void;
    canDeleteJobForecast: boolean | undefined;
    loadForecasts(): Promise<void>;
    openSingleMetricView(forecast: any): Promise<void>;
    deleteForecast(forecastId: any): Promise<void>;
    render(): React.JSX.Element;
}
export namespace ForecastsTable {
    namespace propTypes {
        let job: PropTypes.Validator<object>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
