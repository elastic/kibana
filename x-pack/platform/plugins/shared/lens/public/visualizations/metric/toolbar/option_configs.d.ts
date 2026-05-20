import type { EuiButtonGroupOptionProps } from '@elastic/eui';
import type { PrimaryMetricFontSize, IconPosition, Alignment, PrimaryMetricPosition } from '@kbn/lens-common';
export declare const alignmentOptions: Array<EuiButtonGroupOptionProps & {
    id: Alignment;
}>;
export declare const iconPositionOptions: Array<EuiButtonGroupOptionProps & {
    id: IconPosition;
}>;
export declare const fontSizeOptions: Array<EuiButtonGroupOptionProps & {
    id: PrimaryMetricFontSize;
}>;
export declare const primaryMetricPositionOptions: Array<EuiButtonGroupOptionProps & {
    id: PrimaryMetricPosition;
}>;
