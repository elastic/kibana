export function RunControls({ job, mlNodesAvailable, newForecastDuration, isNewForecastDurationValid, newForecastDurationErrors, neverExpires, onNeverExpiresChange, onNewForecastDurationChange, runForecast, isForecastRequested, forecastProgress, jobOpeningState, jobClosingState, jobState, }: {
    job: any;
    mlNodesAvailable: any;
    newForecastDuration: any;
    isNewForecastDurationValid: any;
    newForecastDurationErrors: any;
    neverExpires: any;
    onNeverExpiresChange: any;
    onNewForecastDurationChange: any;
    runForecast: any;
    isForecastRequested: any;
    forecastProgress: any;
    jobOpeningState: any;
    jobClosingState: any;
    jobState: any;
}): React.JSX.Element;
export namespace RunControls {
    namespace propType {
        let job: PropTypes.Requireable<object>;
        let newForecastDuration: PropTypes.Requireable<string>;
        let isNewForecastDurationValid: PropTypes.Requireable<boolean>;
        let newForecastDurationErrors: PropTypes.Requireable<any[]>;
        let neverExpires: PropTypes.Validator<boolean>;
        let onNewForecastDurationChange: PropTypes.Validator<(...args: any[]) => any>;
        let onNeverExpiresChange: PropTypes.Validator<(...args: any[]) => any>;
        let runForecast: PropTypes.Validator<(...args: any[]) => any>;
        let isForecastRequested: PropTypes.Requireable<boolean>;
        let forecastProgress: PropTypes.Requireable<number>;
        let jobOpeningState: PropTypes.Requireable<number>;
        let jobClosingState: PropTypes.Requireable<number>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
