import moment from 'moment';
export interface GetLogRateAnalysisParametersFromAlertArgs {
    alertStartedAt: string;
    alertEndedAt?: string;
    timeSize?: number;
    timeUnit?: string;
}
export declare const getLogRateAnalysisParametersFromAlert: ({ alertStartedAt, alertEndedAt, timeSize, timeUnit, }: GetLogRateAnalysisParametersFromAlertArgs) => {
    timeRange: {
        min: moment.Moment;
        max: moment.Moment;
    };
    windowParameters: {
        baselineMin: number;
        baselineMax: number;
        deviationMin: number;
        deviationMax: number;
    };
};
export declare const getIntervalFactor: (timeSize?: number, timeUnit?: string) => number;
