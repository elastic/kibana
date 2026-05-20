export function ForecastProgress({ forecastProgress, jobOpeningState, jobClosingState }: {
    forecastProgress: any;
    jobOpeningState: any;
    jobClosingState: any;
}): React.JSX.Element;
export namespace ForecastProgress {
    namespace propType {
        let forecastProgress: PropTypes.Requireable<number>;
        let jobOpeningState: PropTypes.Requireable<number>;
        let jobClosingState: PropTypes.Requireable<number>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
