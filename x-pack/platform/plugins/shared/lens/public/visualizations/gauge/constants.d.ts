import type { GaugeShape, GaugeState as GaugeStateOriginal } from '@kbn/expression-gauge-plugin/common';
import type { LensLayerType as LayerType } from '@kbn/lens-common';
export type { GaugeVisualizationState } from '@kbn/lens-common';
export declare const LENS_GAUGE_ID = "lnsGauge";
export declare const GROUP_ID: {
    readonly METRIC: "metric";
    readonly MIN: "min";
    readonly MAX: "max";
    readonly GOAL: "goal";
};
export type GaugeExpressionState = GaugeStateOriginal & {
    layerId: string;
    layerType: LayerType;
};
export declare const gaugeTitlesByType: Record<GaugeShape, string>;
