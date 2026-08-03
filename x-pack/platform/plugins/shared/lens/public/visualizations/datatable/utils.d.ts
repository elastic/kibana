import type { ColorMapping, ColorStop, CustomPaletteParams, DataBounds, PaletteOutput, PaletteRegistry } from '@kbn/coloring';
import type { CustomPaletteState } from '@kbn/charts-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import { type CellDecorationFillConfig, type CellDecorationFillMode, type CellDecorationValueRange, type ColumnCellDecorationMode } from '@kbn/lens-common';
type ProgressBarPaletteParams = Pick<CustomPaletteParams, 'continuity' | 'rangeType' | 'steps' | 'stops'> | Pick<CustomPaletteState, 'continuity' | 'range' | 'colors' | 'stops'>;
type ProgressBarPalette = PaletteOutput<ProgressBarPaletteParams>;
type ProgressBarPaletteStopInput = number | Pick<ColorStop, 'stop'> | Pick<ColorStop, 'color' | 'stop'>;
export declare function getColumnAlignment<C extends {
    alignment?: 'left' | 'right' | 'center';
}>({ alignment }: C, isNumeric?: boolean): 'left' | 'right' | 'center';
export declare function getSupportedColumnAlignment<C extends {
    alignment?: 'left' | 'right' | 'center';
    colorMode?: ColumnCellDecorationMode;
}>(column: C, isNumeric?: boolean): 'left' | 'right' | 'center';
export declare function hasIncompatibleColorConfig({ colorByTerms, palette, colorMapping, }: {
    colorByTerms: boolean;
    palette?: PaletteOutput<{
        stops?: ColorStop[] | number[];
    }>;
    colorMapping?: ColorMapping.Config | string;
}): boolean;
/**
 * Gets data bounds for an accessor
 */
export declare function getDataBoundsForAccessor(accessor: string, currentData?: Datatable, stateColumns?: Array<{
    isTransposed?: boolean;
}>): DataBounds | undefined;
export declare function getColorByValuePalette(paletteService: PaletteRegistry, dataBounds: DataBounds, existingPalette?: PaletteOutput<CustomPaletteParams>): PaletteOutput<CustomPaletteParams>;
/**
 * Applies correct default color configuration
 */
export declare function getColorDefaults({ colorByTerms, paletteService, dataBounds, }: {
    colorByTerms: boolean;
    paletteService: PaletteRegistry;
    dataBounds: DataBounds;
}): {
    palette: PaletteOutput<CustomPaletteParams> | undefined;
    colorMapping: ColorMapping.Config | undefined;
};
/**
 * Progress bars default to the same palette family the user currently gets when
 * manually switching a numeric color mapping to `Status`. We seed only the
 * palette name here and let the shared coloring helpers derive the rest from
 * the live data bounds, preserving the existing default step count and stop
 * distribution for that manual path.
 */
export declare function getDefaultProgressPalette(): PaletteOutput<CustomPaletteParams>;
export { DEFAULT_PROGRESS_BAR_COLOR, getDecorationDefaultColor } from './cell_decoration';
/**
 * Seeds a fresh fill config for a decoration. Applied only when a column has no
 * existing `fillStyle`, so persisted values are never overridden.
 *
 * The fill mode and color are taken from the decoration's capabilities, so each
 * decoration dictates its own seed from a single source of truth.
 */
export declare function getDefaultFillConfig(colorMode?: ColumnCellDecorationMode): CellDecorationFillConfig;
export declare function isPaletteFillMode(fillMode: CellDecorationFillMode): boolean;
/**
 * Resolves the bar domain `[min, max]` for a decorated column.
 *
 * - `auto`: uses the loaded column data bounds as-is, except a flat all-positive
 *   or all-negative series anchors back to zero so a constant non-zero value does
 *   not render as an empty bar.
 * - `custom`: uses the explicit bounds. `fillStyle.valueRange` is the primary
 *   source; legacy/API columns can still fall back to palette range bounds.
 */
export interface DecorationColumnLike {
    fillStyle?: CellDecorationFillConfig;
    palette?: {
        params?: {
            rangeMin?: number;
            rangeMax?: number;
        };
    };
}
export declare function getProgressBarDomain(column: DecorationColumnLike, dataBounds: DataBounds): {
    min: number;
    max: number;
};
/**
 * Resolves the palette color stops (domain-valued `{ color, stop }[]`) for a
 * solid/gradient progress bar.
 *
 * The expression serializes the resolved palette `colors` for every palette, but
 * only carries explicit numeric `stops` for the `custom` palette; predefined
 * (by-name) palettes serialize empty `stops`. So the resolution order is:
 *
 * 1. `colors` + matching `stops` → convert explicit stop bounds into visible
 *    meter stop starts inside the active progress-bar domain.
 * 2. `colors` only → distribute those colors evenly across the data bounds, so
 *    the user's chosen palette is honored rather than discarded.
 * 3. named `palette` only → resolve that palette's colors from the service and
 *    spread them across the selected progress-bar bounds.
 * 4. nothing usable → fall back to the default progress palette colors.
 */
export declare function getProgressBarPaletteStops(paletteService: PaletteRegistry, dataBounds: DataBounds, palette?: ProgressBarPalette, colors?: string[], stops?: ProgressBarPaletteStopInput[]): Array<{
    color: string;
    stop: number;
}>;
/**
 * Builds a stepped custom-palette state for solid progress-bar fills.
 *
 * `Meter` consumes lower-bound stop starts, but `getColorForValue` expects
 * upper bounds where each color stops applying. The first lower-bound stop
 * always anchors at the active domain start, so solid lookups drop that anchor
 * and keep the remaining stop values as the palette's upper bounds.
 */
export declare function getSolidProgressBarPaletteState(paletteService: PaletteRegistry, dataBounds: DataBounds, palette?: ProgressBarPalette, colors?: string[], stops?: ProgressBarPaletteStopInput[]): CustomPaletteState;
/**
 * Custom value range bounds for the editor's dual-range control, reading from the
 * palette params (solid/gradient) or the dedicated single-fill field.
 *
 * Bounds are always returned as finite numbers: unset or open-ended (`±Infinity`)
 * palette ranges collapse to the loaded data bounds so the range slider never
 * receives a non-finite `min`/`max`/`value`.
 */
export declare function getDecorationCustomRange(column: DecorationColumnLike, dataBounds: DataBounds): CellDecorationValueRange;
