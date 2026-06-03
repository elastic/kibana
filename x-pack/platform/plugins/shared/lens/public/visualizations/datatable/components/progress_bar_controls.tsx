/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiColorPicker,
  EuiDualRange,
  EuiFormRow,
  htmlIdGenerator,
} from '@elastic/eui';
import type { EuiDualRangeProps } from '@elastic/eui';
import type {
  CustomPaletteParams,
  DataBounds,
  PaletteOutput,
  PaletteRegistry,
} from '@kbn/coloring';
import { useDebouncedValue } from '@kbn/visualization-utils';
import type {
  ColumnState,
  CellDecorationFillMode,
  CellDecorationFillConfig,
} from '@kbn/lens-common';
import type { IFieldFormat } from '@kbn/field-formats-plugin/common';
import { ColorMappingByValues } from '../../../shared_components/coloring/color_mapping_by_values';
import { DEFAULT_PROGRESS_BAR_COLOR, getDecorationCustomRange, isPaletteFillMode } from '../utils';

const idPrefix = htmlIdGenerator()();

const barColorOptions: Array<{
  id: string;
  value: CellDecorationFillMode;
  label: string;
  'data-test-subj': string;
}> = [
  {
    id: `${idPrefix}single`,
    value: 'single',
    label: i18n.translate('xpack.lens.table.progressBar.barColor.single', {
      defaultMessage: 'Single',
    }),
    'data-test-subj': 'lnsDatatable_progressBar_barColor_single',
  },
  {
    id: `${idPrefix}solid`,
    value: 'solid',
    label: i18n.translate('xpack.lens.table.progressBar.barColor.solid', {
      defaultMessage: 'Solid',
    }),
    'data-test-subj': 'lnsDatatable_progressBar_barColor_solid',
  },
  {
    id: `${idPrefix}gradient`,
    value: 'gradient',
    label: i18n.translate('xpack.lens.table.progressBar.barColor.gradient', {
      defaultMessage: 'Gradient',
    }),
    'data-test-subj': 'lnsDatatable_progressBar_barColor_gradient',
  },
];

const valueRangeModeOptions = [
  {
    id: `${idPrefix}auto`,
    value: 'auto' as const,
    label: i18n.translate('xpack.lens.table.progressBar.valueRange.auto', {
      defaultMessage: 'Auto',
    }),
    'data-test-subj': 'lnsDatatable_progressBar_valueRange_auto',
  },
  {
    id: `${idPrefix}custom`,
    value: 'custom' as const,
    label: i18n.translate('xpack.lens.table.progressBar.valueRange.custom', {
      defaultMessage: 'Custom',
    }),
    'data-test-subj': 'lnsDatatable_progressBar_valueRange_custom',
  },
];

const barColorLabel = i18n.translate('xpack.lens.table.progressBar.barColor.label', {
  defaultMessage: 'Bar color',
});

const colorLabel = i18n.translate('xpack.lens.table.progressBar.color.label', {
  defaultMessage: 'Color',
});

const valueRangeLabel = i18n.translate('xpack.lens.table.progressBar.valueRange.label', {
  defaultMessage: 'Value range',
});

/**
 * `EuiDualRange` (`EuiRangeTrack`) hard-validates that `max` and every tick value
 * are within `[min, max]` and land exactly on the `step` grid, throwing otherwise.
 * Palette stops and data values can be fractional or off-grid (e.g. percent stops),
 * so we choose a fine, range-derived step and snap/clamp every fed value to it.
 */
const TARGET_STEP_SUBDIVISIONS = 100;

/**
 * Returns a positive step that evenly subdivides `[min, max]` so EUI's step-grid
 * validation passes for any value we clamp into the range.
 */
function getSafeStep(min: number, max: number): number {
  const span = Math.abs(max - min);
  if (!Number.isFinite(span) || span <= 0) return 1;
  // Prefer an integer step for clean inputs when the span is large enough,
  // otherwise fall back to an exact fractional subdivision of the span.
  const integerStep = Math.max(1, Math.floor(span / TARGET_STEP_SUBDIVISIONS));
  if (span % integerStep === 0) return integerStep;
  return span / TARGET_STEP_SUBDIVISIONS;
}

/** Clamps `value` into `[min, max]` and snaps it to the nearest `min + k*step`. */
function snapToStep(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(Math.max(value, min), max);
  if (!Number.isFinite(step) || step <= 0) return clamped;
  const snapped = min + Math.round((clamped - min) / step) * step;
  // Guard against floating drift pushing us a hair outside the bounds.
  return Math.min(Math.max(snapped, min), max);
}

/**
 * Short unit appended to the range inputs, derived from the column's value format.
 * Hidden for the default number format (no meaningful unit), shown for explicit
 * formats such as bytes or percent. Mirrors "formatting is inherited from Value Format".
 */
function getFormatUnit(formatter?: IFieldFormat): string | undefined {
  const id = formatter?.type?.id;
  if (!id || id === 'number') return undefined;
  return formatter?.type?.title || undefined;
}

export interface ProgressBarControlsProps {
  column: ColumnState;
  fillStyle: CellDecorationFillConfig;
  dataBounds: DataBounds;
  palette: PaletteOutput<CustomPaletteParams>;
  paletteService: PaletteRegistry;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  isInlineEditing?: boolean;
  formatter?: IFieldFormat;
  onUpdate: (newColumn: Partial<ColumnState>) => void;
}

/**
 * Editor controls for the "Progress bar" cell decoration: bar fill style,
 * the single/palette color source, and the value range that drives the bar domain.
 */
export function ProgressBarControls({
  column,
  fillStyle,
  dataBounds,
  palette,
  paletteService,
  panelRef,
  isInlineEditing,
  formatter,
  onUpdate,
}: ProgressBarControlsProps) {
  const { fillMode } = fillStyle;
  const usesPalette = isPaletteFillMode(fillMode);
  const effectiveRange = getDecorationCustomRange(column, dataBounds);
  const isCustomRange = effectiveRange.mode === 'custom';

  const setBarColor = useCallback(
    (nextFillMode: CellDecorationFillMode) => {
      if (nextFillMode === fillMode) return;

      const nextFillStyle: CellDecorationFillConfig = { ...fillStyle, fillMode: nextFillMode };
      const update: Partial<ColumnState> = {};

      if (nextFillMode === 'single') {
        // Moving to single: seed the single color and capture any palette-driven
        // custom range into the dedicated single-mode field so the bar domain is stable.
        nextFillStyle.color = fillStyle.color ?? DEFAULT_PROGRESS_BAR_COLOR;
        nextFillStyle.valueRange = isCustomRange
          ? { mode: 'custom', min: effectiveRange.min, max: effectiveRange.max }
          : { mode: 'auto' };
      } else {
        // Moving to solid/gradient: ensure a palette exists; sync any single-mode
        // custom range onto the palette params so colors and bar share one domain.
        nextFillStyle.valueRange = { mode: effectiveRange.mode };
        const nextPalette: PaletteOutput<CustomPaletteParams> = {
          ...palette,
          params: {
            ...palette.params,
            ...(isCustomRange
              ? { rangeType: 'number', rangeMin: effectiveRange.min, rangeMax: effectiveRange.max }
              : {}),
          },
        };
        update.palette = nextPalette;
      }

      update.fillStyle = nextFillStyle;
      onUpdate(update);
    },
    [fillMode, fillStyle, isCustomRange, effectiveRange, palette, onUpdate]
  );

  const setSingleColor = useCallback(
    (color: string) => {
      onUpdate({ fillStyle: { ...fillStyle, color } });
    },
    [fillStyle, onUpdate]
  );

  const setRangeMode = useCallback(
    (mode: 'auto' | 'custom') => {
      if (mode === effectiveRange.mode) return;

      const min = effectiveRange.min ?? dataBounds.min;
      const max = effectiveRange.max ?? dataBounds.max;

      if (usesPalette) {
        const nextPalette: PaletteOutput<CustomPaletteParams> = {
          ...palette,
          params: {
            ...palette.params,
            ...(mode === 'custom'
              ? { rangeType: 'number', rangeMin: min, rangeMax: max }
              : { rangeMin: undefined, rangeMax: undefined }),
          },
        };
        onUpdate({
          palette: nextPalette,
          fillStyle: { ...fillStyle, valueRange: { mode } },
        });
      } else {
        onUpdate({
          fillStyle: {
            ...fillStyle,
            valueRange: mode === 'custom' ? { mode, min, max } : { mode },
          },
        });
      }
    },
    [effectiveRange, dataBounds, usesPalette, palette, fillStyle, onUpdate]
  );

  const setCustomRange = useCallback(
    ([min, max]: [number, number]) => {
      if (usesPalette) {
        const nextPalette: PaletteOutput<CustomPaletteParams> = {
          ...palette,
          params: { ...palette.params, rangeType: 'number', rangeMin: min, rangeMax: max },
        };
        onUpdate({
          palette: nextPalette,
          fillStyle: { ...fillStyle, valueRange: { mode: 'custom' } },
        });
      } else {
        onUpdate({
          fillStyle: { ...fillStyle, valueRange: { mode: 'custom', min, max } },
        });
      }
    },
    [usesPalette, palette, fillStyle, onUpdate]
  );

  const { inputValue: singleColor, handleInputChange: handleSingleColorChange } =
    useDebouncedValue<string>(
      { onChange: setSingleColor, value: fillStyle.color ?? DEFAULT_PROGRESS_BAR_COLOR },
      { allowFalsyValue: true }
    );

  // `getDecorationCustomRange` already collapses unset/open-ended bounds to the
  // data bounds, but guard once more so the slider math below stays finite even
  // if the data bounds themselves are degenerate.
  const rangeValue = useMemo<[number, number]>(() => {
    const lower = Number.isFinite(effectiveRange.min) ? (effectiveRange.min as number) : 0;
    const upper = Number.isFinite(effectiveRange.max) ? (effectiveRange.max as number) : lower + 1;
    return [lower, upper];
  }, [effectiveRange.min, effectiveRange.max]);

  // The slider spans the data bounds, the current custom range, and the 0
  // baseline, plus a small padding so a value can be nudged just outside the
  // data extremes. The bounds always include the current values, so a value
  // typed beyond them simply widens the slider on the next render instead of
  // being clamped away.
  const [sliderMin, sliderMax] = useMemo<[number, number]>(() => {
    const lowerData = Math.min(dataBounds.min, rangeValue[0], 0);
    const upperData = Math.max(dataBounds.max, rangeValue[1], 0);
    const span = upperData - lowerData;
    const padding = span > 0 ? Math.ceil(span * 0.1) : Math.max(Math.abs(upperData), 1);
    return [Math.floor(lowerData - padding), Math.ceil(upperData + padding)];
  }, [dataBounds.min, dataBounds.max, rangeValue]);

  // A step that evenly divides the slider range keeps EUI's step-grid validation
  // satisfied for any clamped/snapped value, ticks, or level boundary.
  const step = useMemo(() => getSafeStep(sliderMin, sliderMax), [sliderMin, sliderMax]);

  // Snap the displayed/committed range to the step grid and slider bounds so the
  // dual range never receives an off-grid or out-of-range value.
  const safeRangeValue = useMemo<[number, number]>(
    () => [
      snapToStep(rangeValue[0], sliderMin, sliderMax, step),
      snapToStep(rangeValue[1], sliderMin, sliderMax, step),
    ],
    [rangeValue, sliderMin, sliderMax, step]
  );

  const { inputValue: localRange, handleInputChange: handleRangeChange } = useDebouncedValue<
    [number, number]
  >({ onChange: setCustomRange, value: safeRangeValue }, { allowFalsyValue: true });

  // Tint the dual-range track (rendered inside the popover) with the chosen
  // palette / single color. Level boundaries are clamped to the slider range so
  // they always sit within the rendered track.
  const levels = useMemo<EuiDualRangeProps['levels']>(() => {
    const clamp = (value: number) => Math.min(Math.max(value, sliderMin), sliderMax);
    if (usesPalette) {
      const stops = palette.params?.stops ?? [];
      if (stops.length) {
        return stops.map((stop, index) => ({
          min: clamp(index === 0 ? safeRangeValue[0] : stops[index - 1].stop),
          max: clamp(stop.stop),
          color: stop.color,
        }));
      }
    }
    return [
      {
        min: clamp(safeRangeValue[0]),
        max: clamp(safeRangeValue[1]),
        color: fillStyle.color ?? DEFAULT_PROGRESS_BAR_COLOR,
      },
    ];
  }, [safeRangeValue, usesPalette, palette.params?.stops, fillStyle.color, sliderMin, sliderMax]);

  const formatUnit = useMemo(() => getFormatUnit(formatter), [formatter]);
  const append = formatUnit ? { append: formatUnit } : {};

  return (
    <>
      <EuiFormRow display="columnCompressed" fullWidth label={barColorLabel}>
        <EuiButtonGroup
          isFullWidth
          legend={barColorLabel}
          data-test-subj="lnsDatatable_progressBar_barColor"
          buttonSize="compressed"
          options={barColorOptions}
          idSelected={`${idPrefix}${fillMode}`}
          onChange={(id) => {
            const option = barColorOptions.find((o) => o.id === id);
            if (option) setBarColor(option.value);
          }}
        />
      </EuiFormRow>

      {fillMode === 'single' ? (
        <EuiFormRow display="columnCompressed" fullWidth label={colorLabel}>
          <EuiColorPicker
            fullWidth
            compressed
            isClearable={false}
            onChange={handleSingleColorChange}
            color={singleColor}
            aria-label={colorLabel}
            data-test-subj="lnsDatatable_progressBar_color"
          />
        </EuiFormRow>
      ) : (
        <ColorMappingByValues
          palette={palette}
          isInlineEditing={isInlineEditing}
          setPalette={(newPalette) => onUpdate({ palette: newPalette })}
          paletteService={paletteService}
          panelRef={panelRef}
          dataBounds={dataBounds}
        />
      )}

      <EuiFormRow display="columnCompressed" fullWidth label={valueRangeLabel}>
        <EuiButtonGroup
          isFullWidth
          legend={valueRangeLabel}
          data-test-subj="lnsDatatable_progressBar_valueRange"
          buttonSize="compressed"
          options={valueRangeModeOptions}
          idSelected={`${idPrefix}${effectiveRange.mode}`}
          onChange={(id) => {
            const option = valueRangeModeOptions.find((o) => o.id === id);
            if (option) setRangeMode(option.value);
          }}
        />
      </EuiFormRow>

      {isCustomRange && (
        <EuiFormRow display="columnCompressed" fullWidth label={''}>
          <EuiDualRange
            id={`${idPrefix}valueRangeSlider`}
            min={sliderMin}
            max={sliderMax}
            step={step}
            value={localRange}
            onChange={(value) => {
              const [next0, next1] = value as [number, number];
              handleRangeChange([Number(next0), Number(next1)]);
            }}
            showInput="inputWithPopover"
            showLabels
            levels={levels}
            fullWidth
            compressed
            aria-label={valueRangeLabel}
            data-test-subj="lnsDatatable_progressBar_valueRangeSlider"
            {...append}
          />
        </EuiFormRow>
      )}
    </>
  );
}
