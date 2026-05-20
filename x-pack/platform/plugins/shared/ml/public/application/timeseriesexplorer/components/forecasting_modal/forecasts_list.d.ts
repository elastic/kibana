export function ForecastsList({ forecasts, viewForecast, selectedForecastId }: {
    forecasts: any;
    viewForecast: any;
    selectedForecastId: any;
}): React.JSX.Element;
export namespace ForecastsList {
    namespace propType {
        let forecasts: PropTypes.Requireable<any[]>;
        let viewForecast: PropTypes.Validator<(...args: any[]) => any>;
        let selectedForecastId: PropTypes.Requireable<string>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
