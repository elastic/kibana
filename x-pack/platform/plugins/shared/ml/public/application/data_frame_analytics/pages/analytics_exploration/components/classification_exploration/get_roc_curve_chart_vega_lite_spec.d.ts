import type { TopLevelSpec } from 'vega-lite/build/vega-lite';
import { type EuiThemeComputed } from '@elastic/eui';
import type { RocCurveItem } from '@kbn/ml-data-frame-analytics-utils';
export interface RocCurveDataRow extends RocCurveItem {
    class_name: string;
}
export declare const getRocCurveChartVegaLiteSpec: (classificationClasses: string[], data: RocCurveDataRow[], legendTitle: string, euiTheme: EuiThemeComputed) => TopLevelSpec;
