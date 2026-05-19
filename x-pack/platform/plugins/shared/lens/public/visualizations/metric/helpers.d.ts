import type { CoreTheme } from '@kbn/core/public';
import type { VisualizationDimensionEditorProps, MetricVisualizationState, SecondaryTrendType } from '@kbn/lens-common';
import type { PaletteTriplet, SecondaryTrendPalettes } from './types';
export declare function getColorMode(secondaryTrend: MetricVisualizationState['secondaryTrend'], isMetricNumeric: boolean): SecondaryTrendType;
export declare function getSecondaryLabelSelected(state: VisualizationDimensionEditorProps<MetricVisualizationState>['state'], { defaultSecondaryLabel, colorMode, isPrimaryMetricNumeric, }: {
    defaultSecondaryLabel: string;
    colorMode: SecondaryTrendType;
    isPrimaryMetricNumeric: boolean;
}): {
    mode: 'auto' | 'none';
} | {
    mode: 'custom';
    label: string;
};
export declare function getTrendPalette(colorMode: SecondaryTrendType, secondaryTrend: MetricVisualizationState['secondaryTrend'], theme: CoreTheme): PaletteTriplet | undefined;
export declare function getSecondaryTrendPalettes(colorMode: SecondaryTrendType, secondaryTrend: MetricVisualizationState['secondaryTrend'], theme: CoreTheme): SecondaryTrendPalettes | undefined;
export declare function getSecondaryDynamicTrendBaselineValue(isPrimaryMetricNumeric: boolean, baselineValue: number | 'primary'): number | "primary";
export declare function isSecondaryTrendConfigInvalid(secondaryTrend: MetricVisualizationState['secondaryTrend'], colorMode: SecondaryTrendType, isPrimaryMetricNumeric: boolean): boolean;
