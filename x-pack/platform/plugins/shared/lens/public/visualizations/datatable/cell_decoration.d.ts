import type { CellDecorationFillMode, CellDecorationFillConfig, ColumnCellDecorationMode } from '@kbn/lens-common';
/**
 * The data kind of a datatable column, from the coloring perspective:
 * - `numeric`: a numeric metric (value-driven decorations apply).
 * - `bucketed`: a categorical / bucketed column (terms-driven decorations apply).
 *
 * Mirrors the `isNumeric` / `isCategory` split returned by `getAccessorType`.
 */
export type ColumnKind = 'numeric' | 'bucketed';
/** Column text alignments a decoration can be paired with. */
export type CellAlignment = 'left' | 'center' | 'right';
/** Default single-fill color seeded by the `progress` decoration: Datavis Color 2 (per elastic/kibana#250708). */
export declare const DEFAULT_PROGRESS_BAR_COLOR: string;
/**
 * Static capabilities of a single cell-decoration mode.
 *
 * This is the one place that declares, per decoration, which columns it applies
 * to, which alignments it supports, and the defaults it seeds. The editor, the
 * expression builder, and tests all resolve from here so behavior and copy stay
 * consistent and translatable without touching the underlying data props.
 */
export interface CellDecorationCapabilities {
    mode: ColumnCellDecorationMode;
    /** Translated, user-facing label shown in the "Cell decoration" picker. */
    getLabel: () => string;
    /** Column kinds this decoration can be applied to. Empty means "no column gate" (e.g. `none`). */
    supportedColumnKinds: readonly ColumnKind[];
    /** Alignments this decoration supports. */
    supportedAlignments: readonly CellAlignment[];
    /**
     * Alignment to force when seeding the decoration on a column whose current
     * alignment is unsupported. Falls back to the column's natural alignment when
     * unset.
     */
    defaultAlignment?: CellAlignment;
    /**
     * Default fill color seeded for a fresh decoration, or `undefined` when the
     * decoration has no opinion (falling back to palette/contrast defaults).
     */
    defaultColor?: string;
    /** Default fill mode seeded for a fresh value-driven decoration. */
    defaultFillMode?: CellDecorationFillMode;
}
/**
 * The cell-decoration capability registry, keyed by stored `colorMode` value.
 */
export declare const CELL_DECORATION_CAPABILITIES: Record<ColumnCellDecorationMode, CellDecorationCapabilities>;
export declare function getCellDecorationCapabilities(mode?: ColumnCellDecorationMode): CellDecorationCapabilities;
/** Translated label for a decoration mode (single source for editor + tests). */
export declare function getCellDecorationLabel(mode?: ColumnCellDecorationMode): string;
/** Whether a decoration mode applies to the given column kind. */
export declare function isColumnKindSupported(mode: ColumnCellDecorationMode, columnKind: ColumnKind): boolean;
/** Whether a decoration mode supports the given alignment. */
export declare function isAlignmentSupported(mode: ColumnCellDecorationMode, alignment: CellAlignment): boolean;
/**
 * Human-readable reason an alignment is unavailable for a decoration, or
 * `undefined` when it is supported. Used as a disabled control's tooltip.
 */
export declare function getUnsupportedAlignmentReason(mode: ColumnCellDecorationMode, alignment: CellAlignment): string | undefined;
/**
 * Human-readable reason a decoration cannot be applied to the current column
 * kind, or `undefined` when it can. Used as a disabled option's tooltip.
 */
export declare function getUnsupportedColumnKindReason(mode: ColumnCellDecorationMode, columnKind: ColumnKind): string | undefined;
export declare function getAlignmentLabel(alignment: CellAlignment): string;
/** Default fill color a decoration seeds when none is set (or `undefined`). */
export declare function getDecorationDefaultColor(mode: ColumnCellDecorationMode): string | undefined;
/**
 * Reads the decoration fill config carried on the expression args. The value is
 * the JSON string it is serialized to by the expression builder, plus a
 * permissive object fallback for legacy/test-time callers. Malformed or
 * shape-invalid values degrade to `undefined` so the cell falls back to plain
 * formatting.
 */
export declare function parseCellDecorationFillConfig(raw: unknown): CellDecorationFillConfig | undefined;
