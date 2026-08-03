import React, { type CSSProperties, type ReactNode } from 'react';
import { MeterSize } from '@elastic/charts';
import type { MeterColorStop, MeterFill } from '@elastic/charts';
import type { RawValue } from '@kbn/data-plugin/common';
import type { DataGridDensity, CellDecorationFillConfig } from '@kbn/lens-common';
import { type Alignment } from './cell_value_helpers';
/** Maps the table density to a Meter thickness preset. */
export declare function getProgressBarSize(density?: DataGridDensity): (typeof MeterSize)[keyof typeof MeterSize];
/**
 * Returns an optional inline height override for the rendered Meter.
 *
 * Lens keeps the existing size presets for layout semantics but trims the
 * default/normal density to an intermediate height between compact (8px) and
 * expanded (16px), matching follow-up review feedback without changing charts.
 */
export declare function getProgressBarStyle(density?: DataGridDensity): CSSProperties | undefined;
/**
 * Zips a render-layer palette (`CustomPaletteState`: parallel `colors`/`stops` arrays)
 * into domain-valued {@link MeterColorStop}s expected by the Meter.
 */
export declare function toMeterColorStops(colors: string[] | undefined, stops: number[] | undefined): MeterColorStop[];
/**
 * Builds the {@link MeterFill} for a decorated column from its fill mode and
 * pre-zipped, domain-valued color stops.
 *
 * Single fills use a fixed color; solid/gradient fills reveal the palette via the stops.
 */
export declare function getMeterFill(fillStyle: CellDecorationFillConfig, colorStops: MeterColorStop[], fallbackColor: string): MeterFill;
export interface ProgressBarCellProps {
    value: number;
    label: ReactNode;
    domain: [number, number];
    fill: MeterFill;
    size: (typeof MeterSize)[keyof typeof MeterSize];
    meterStyle?: CSSProperties;
    alignment: Alignment;
    /**
     * Character width to reserve for the value gutter so the bar starts/ends at the
     * same x across rows regardless of digit count. Derived from the column's widest
     * formatted value; falls back to a small default.
     */
    labelWidthCh?: number;
    /**
     * Value at which the fill starts (defaults to `0`). The fill grows from this
     * baseline toward the value, leaving the track empty before it when the
     * baseline sits inside the domain.
     */
    baseline?: number;
    ariaLabel?: string;
    /** When set, the value label becomes a one-click filter trigger. */
    onLabelClick?: () => void;
}
interface LabelFormatter {
    convertToText?: (value: RawValue) => string;
}
/**
 * Reserves gutter width (in `ch`) from the column's widest formatted bound so the
 * bar shares a consistent edge across rows. With `tabular-nums` each character is
 * one `ch`, so the longest formatted bound's length is the column-wide gutter.
 */
export declare function getProgressBarLabelWidthCh(formatter: LabelFormatter | undefined, min: number, max: number): number;
/**
 * Renders a numeric cell as a value label beside a horizontal {@link Meter} that
 * fills the remaining cell width.
 *
 * The value sits on the leading side for left alignment and the trailing side for
 * right alignment, following the column's text alignment so the bar grows away
 * from the value (matching the cell-decoration mockup).
 *
 * The fill starts from `baseline` (default `0`). When the fill does not begin at
 * the domain's lower edge — i.e. the baseline sits inside the domain — the start
 * fill edge is left square so the bar reads cleanly as it grows from the anchor.
 */
export declare const ProgressBarCell: ({ value, label, domain, fill, size, meterStyle, alignment, labelWidthCh, baseline, ariaLabel, onLabelClick, }: ProgressBarCellProps) => React.JSX.Element;
export {};
