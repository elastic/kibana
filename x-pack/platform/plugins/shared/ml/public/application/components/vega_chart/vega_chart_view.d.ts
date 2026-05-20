import type { FC } from 'react';
import type { TopLevelSpec } from 'vega-lite';
export interface VegaChartViewProps {
    vegaSpec: TopLevelSpec;
}
export declare const VegaChartView: FC<VegaChartViewProps>;
export default VegaChartView;
