import React from 'react';
import type { EuiSelectOption } from '@elastic/eui';
import { OBSERVABILITY_LAYER_TYPE } from './layer_select';
export declare enum OBSERVABILITY_METRIC_TYPE {
    TRANSACTION_DURATION = "TRANSACTION_DURATION",
    COUNT = "COUNT",
    UNIQUE_COUNT = "UNIQUE_COUNT"
}
export declare function getMetricOptionsForLayer(layer: OBSERVABILITY_LAYER_TYPE): EuiSelectOption[];
interface Props {
    layer: OBSERVABILITY_LAYER_TYPE | null;
    value: OBSERVABILITY_METRIC_TYPE | null;
    onChange: (metricType: OBSERVABILITY_METRIC_TYPE) => void;
}
export declare function MetricSelect(props: Props): React.JSX.Element | null;
export {};
