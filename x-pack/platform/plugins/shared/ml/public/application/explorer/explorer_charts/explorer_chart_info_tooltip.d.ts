export function ExplorerChartInfoTooltip({ jobId, aggregationInterval, chartFunction, chartType, entityFields, }: {
    jobId: any;
    aggregationInterval: any;
    chartFunction: any;
    chartType: any;
    entityFields?: never[] | undefined;
}): React.JSX.Element;
export namespace ExplorerChartInfoTooltip {
    namespace propTypes {
        let jobId: PropTypes.Validator<string>;
        let aggregationInterval: PropTypes.Requireable<string>;
        let chartFunction: PropTypes.Requireable<string>;
        let entityFields: PropTypes.Requireable<any[]>;
    }
}
import React from 'react';
import PropTypes from 'prop-types';
