/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type {
  CellDecorationFillMode,
  CellDecorationFillConfig,
  ColumnCellDecorationMode,
} from '@kbn/lens-common';
import { COLUMN_CELL_DECORATION_MODE } from '@kbn/lens-common';
import { euiThemeVars } from '@kbn/ui-theme';

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

const ALL_ALIGNMENTS: readonly CellAlignment[] = ['left', 'center', 'right'];

/** Default single-fill color seeded by the `progress` decoration: Datavis Color 2 (per elastic/kibana#250708). */
export const DEFAULT_PROGRESS_BAR_COLOR = euiThemeVars.euiColorVis2;

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

const numericLabel = () =>
  i18n.translate('xpack.lens.table.cellDecoration.requirement.numeric', {
    defaultMessage: 'numeric columns',
  });

const bucketedLabel = () =>
  i18n.translate('xpack.lens.table.cellDecoration.requirement.bucketed', {
    defaultMessage: 'bucketed columns',
  });

const COLUMN_KIND_LABEL: Record<ColumnKind, () => string> = {
  numeric: numericLabel,
  bucketed: bucketedLabel,
};

/**
 * The cell-decoration capability registry, keyed by stored `colorMode` value.
 */
export const CELL_DECORATION_CAPABILITIES: Record<
  ColumnCellDecorationMode,
  CellDecorationCapabilities
> = {
  [COLUMN_CELL_DECORATION_MODE.NONE]: {
    mode: COLUMN_CELL_DECORATION_MODE.NONE,
    getLabel: () =>
      i18n.translate('xpack.lens.table.dynamicColoring.none', { defaultMessage: 'None' }),
    supportedColumnKinds: [],
    supportedAlignments: ALL_ALIGNMENTS,
  },
  [COLUMN_CELL_DECORATION_MODE.CELL]: {
    mode: COLUMN_CELL_DECORATION_MODE.CELL,
    getLabel: () =>
      i18n.translate('xpack.lens.table.dynamicColoring.cell', { defaultMessage: 'Background' }), // `'cell'` is surfaced as "Background"
    supportedColumnKinds: ['numeric', 'bucketed'],
    supportedAlignments: ALL_ALIGNMENTS,
  },
  [COLUMN_CELL_DECORATION_MODE.BADGE]: {
    mode: COLUMN_CELL_DECORATION_MODE.BADGE,
    getLabel: () =>
      i18n.translate('xpack.lens.table.dynamicColoring.badge', { defaultMessage: 'Badge' }),
    supportedColumnKinds: ['numeric', 'bucketed'],
    supportedAlignments: ALL_ALIGNMENTS,
  },
  [COLUMN_CELL_DECORATION_MODE.TEXT]: {
    mode: COLUMN_CELL_DECORATION_MODE.TEXT,
    getLabel: () =>
      i18n.translate('xpack.lens.table.dynamicColoring.text', { defaultMessage: 'Text' }),
    supportedColumnKinds: ['numeric', 'bucketed'],
    supportedAlignments: ALL_ALIGNMENTS,
  },
  [COLUMN_CELL_DECORATION_MODE.PROGRESS]: {
    mode: COLUMN_CELL_DECORATION_MODE.PROGRESS,
    getLabel: () =>
      i18n.translate('xpack.lens.table.dynamicColoring.progress', {
        defaultMessage: 'Progress bar',
      }),
    // Progress bars read a numeric domain, so they are offered for numeric columns only.
    supportedColumnKinds: ['numeric'],
    // The value sits beside the bar; centering it reads poorly, so center is unsupported.
    supportedAlignments: ['left', 'right'],
    defaultAlignment: 'right',
    defaultColor: DEFAULT_PROGRESS_BAR_COLOR,
    defaultFillMode: 'gradient',
  },
};

export function getCellDecorationCapabilities(
  mode: ColumnCellDecorationMode = COLUMN_CELL_DECORATION_MODE.NONE
): CellDecorationCapabilities {
  return CELL_DECORATION_CAPABILITIES[mode];
}

/** Translated label for a decoration mode (single source for editor + tests). */
export function getCellDecorationLabel(
  mode: ColumnCellDecorationMode = COLUMN_CELL_DECORATION_MODE.NONE
): string {
  return getCellDecorationCapabilities(mode).getLabel();
}

/** Whether a decoration mode applies to the given column kind. */
export function isColumnKindSupported(
  mode: ColumnCellDecorationMode,
  columnKind: ColumnKind
): boolean {
  const { supportedColumnKinds } = getCellDecorationCapabilities(mode);
  return supportedColumnKinds.length === 0 || supportedColumnKinds.includes(columnKind);
}

/** Whether a decoration mode supports the given alignment. */
export function isAlignmentSupported(
  mode: ColumnCellDecorationMode,
  alignment: CellAlignment
): boolean {
  return getCellDecorationCapabilities(mode).supportedAlignments.includes(alignment);
}

/**
 * Human-readable reason an alignment is unavailable for a decoration, or
 * `undefined` when it is supported. Used as a disabled control's tooltip.
 */
export function getUnsupportedAlignmentReason(
  mode: ColumnCellDecorationMode,
  alignment: CellAlignment
): string | undefined {
  if (isAlignmentSupported(mode, alignment)) return undefined;
  return i18n.translate('xpack.lens.table.cellDecoration.alignmentUnsupported', {
    defaultMessage: `{alignment} alignment isn't supported by the {decoration} cell decoration.`,
    values: {
      alignment: ALIGNMENT_LABEL[alignment](),
      decoration: getCellDecorationLabel(mode),
    },
  });
}

/**
 * Human-readable reason a decoration cannot be applied to the current column
 * kind, or `undefined` when it can. Used as a disabled option's tooltip.
 */
export function getUnsupportedColumnKindReason(
  mode: ColumnCellDecorationMode,
  columnKind: ColumnKind
): string | undefined {
  if (isColumnKindSupported(mode, columnKind)) return undefined;
  const { supportedColumnKinds } = getCellDecorationCapabilities(mode);
  const supportedLabel = supportedColumnKinds.map((kind) => COLUMN_KIND_LABEL[kind]()).join(', ');
  return i18n.translate('xpack.lens.table.cellDecoration.columnKindUnsupported', {
    defaultMessage: 'The {decoration} cell decoration is only supported for {supported}.',
    values: { decoration: getCellDecorationLabel(mode), supported: supportedLabel },
  });
}

const ALIGNMENT_LABEL: Record<CellAlignment, () => string> = {
  left: () => i18n.translate('xpack.lens.table.alignment.left', { defaultMessage: 'Left' }),
  center: () => i18n.translate('xpack.lens.table.alignment.center', { defaultMessage: 'Center' }),
  right: () => i18n.translate('xpack.lens.table.alignment.right', { defaultMessage: 'Right' }),
};

export function getAlignmentLabel(alignment: CellAlignment): string {
  return ALIGNMENT_LABEL[alignment]();
}

/** Default fill color a decoration seeds when none is set (or `undefined`). */
export function getDecorationDefaultColor(mode: ColumnCellDecorationMode): string | undefined {
  return getCellDecorationCapabilities(mode).defaultColor;
}

function isCellDecorationValueRange(raw: unknown): boolean {
  if (typeof raw !== 'object' || raw === null || !('mode' in raw)) {
    return false;
  }

  if (raw.mode !== 'auto' && raw.mode !== 'custom') {
    return false;
  }

  if ('min' in raw && raw.min !== undefined && typeof raw.min !== 'number') {
    return false;
  }

  if ('max' in raw && raw.max !== undefined && typeof raw.max !== 'number') {
    return false;
  }

  return true;
}

function isCellDecorationFillConfig(raw: unknown): raw is CellDecorationFillConfig {
  if (typeof raw !== 'object' || raw === null || !('fillMode' in raw)) {
    return false;
  }

  if (raw.fillMode !== 'single' && raw.fillMode !== 'solid' && raw.fillMode !== 'gradient') {
    return false;
  }

  if ('color' in raw && raw.color !== undefined && typeof raw.color !== 'string') {
    return false;
  }

  if ('baseline' in raw && raw.baseline !== undefined && typeof raw.baseline !== 'number') {
    return false;
  }

  if (
    'valueRange' in raw &&
    raw.valueRange !== undefined &&
    !isCellDecorationValueRange(raw.valueRange)
  ) {
    return false;
  }

  return true;
}

/**
 * Reads the decoration fill config carried on the expression args. The value is
 * the JSON string it is serialized to by the expression builder, plus a
 * permissive object fallback for legacy/test-time callers. Malformed or
 * shape-invalid values degrade to `undefined` so the cell falls back to plain
 * formatting.
 */
export function parseCellDecorationFillConfig(raw: unknown): CellDecorationFillConfig | undefined {
  if (raw == null) return undefined;
  if (isCellDecorationFillConfig(raw)) return raw;
  if (typeof raw !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isCellDecorationFillConfig(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
