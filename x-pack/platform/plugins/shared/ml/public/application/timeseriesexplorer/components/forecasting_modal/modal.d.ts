export function Modal(props: any): React.JSX.Element;
export namespace Modal {
    namespace propType {
        let job: PropTypes.Requireable<object>;
        let forecasts: PropTypes.Requireable<any[]>;
        let close: PropTypes.Validator<(...args: any[]) => any>;
        let viewForecast: PropTypes.Validator<(...args: any[]) => any>;
        let runForecast: PropTypes.Validator<(...args: any[]) => any>;
        let newForecastDuration: PropTypes.Requireable<string>;
        let isNewForecastDurationValid: PropTypes.Requireable<boolean>;
        let newForecastDurationErrors: PropTypes.Requireable<any[]>;
        let onNewForecastDurationChange: PropTypes.Validator<(...args: any[]) => any>;
        let isForecastRequested: PropTypes.Requireable<boolean>;
        let forecastProgress: PropTypes.Requireable<number>;
        let jobOpeningState: PropTypes.Requireable<number>;
        let jobClosingState: PropTypes.Requireable<number>;
        let messages: PropTypes.Requireable<any[]>;
        let selectedForecastId: PropTypes.Requireable<string>;
    }
}
import React from 'react';
import type PropTypes from 'prop-types';
