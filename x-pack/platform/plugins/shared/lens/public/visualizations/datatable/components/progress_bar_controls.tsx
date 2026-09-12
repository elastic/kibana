/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutableRefObject } from 'react';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonGroup,
  EuiColorPicker,
  EuiDualRange,
  EuiFieldNumber,
  EuiFormControlLayoutDelimited,
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
  CellDecorationValueRange,
} from '@kbn/lens-common';
import { ColorMappingByValues } from '../../../shared_components/coloring/color_mapping_by_values';
import {
  DEFAULT_PROGRESS_BAR_COLOR,
  getDecorationCustomRange,
  getProgressBarDomain,
  getProgressBarPaletteStops,
  isPaletteFillMode,
} from '../utils';

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

const autoValueRangeTooltip = i18n.translate(
  'xpack.lens.table.progressBar.valueRange.autoTooltip',
  {
    defaultMessage:
      'Auto uses the loaded data range for this column. Switch to Custom to set your own min and max.',
  }
);

const customValueRangeTooltip = i18n.translate(
  'xpack.lens.table.progressBar.valueRange.customTooltip',
  {
    defaultMessage:
      'Custom lets you change the range. You can also reverse color order or tweak color stops by editing Color mapping.',
  }
);

const valueRangeModeOptions = [
  {
    id: `${idPrefix}auto`,
    value: 'auto' as const,
    label: i18n.translate('xpack.lens.table.progressBar.valueRange.auto', {
      defaultMessage: 'Auto',
    }),
    toolTipContent: autoValueRangeTooltip,
    'data-test-subj': 'lnsDatatable_progressBar_valueRange_auto',
  },
  {
    id: `${idPrefix}custom`,
    value: 'custom' as const,
    label: i18n.translate('xpack.lens.table.progressBar.valueRange.custom', {
      defaultMessage: 'Custom',
    }),
    toolTipContent: customValueRangeTooltip,
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
const minValueRangeLabel = i18n.translate('xpack.lens.table.progressBar.valueRange.minLabel', {
  defaultMessage: 'Minimum value range',
});
const maxValueRangeLabel = i18n.translate('xpack.lens.table.progressBar.valueRange.maxLabel', {
  defaultMessage: 'Maximum value range',
});

const MANUAL_INPUT_SYNC_DELAY_MS = 250;
const PASSIVE_SLIDER_BOUND_RESET_THRESHOLD = 0.33;

const valueRangeAppendCss = css`
  && .euiFormControlLayout__append {
    max-inline-size: 26%;
    min-inline-size: 0;
  }

  && .euiFormControlLayout__append > *,
  && .euiFormControlLayout__append .euiFormAppend,
  && .euiFormControlLayout__append .lnsDatatableProgressBarAppendLabel {
    max-inline-size: 100%;
    min-inline-size: 0;
  }

  && .euiFormControlLayout__append .euiFormAppend {
    overflow: hidden;
  }

  && .euiFormControlLayout__append .lnsDatatableProgressBarAppendLabel {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

function getDecimalPlaces(value: number): number {
  if (!Number.isFinite(value)) return 0;

  return getDecimalPlacesFromNormalizedText(String(value).toLowerCase());
}

function getDecimalPlacesFromNormalizedText(valueText: string): number {
  const scientificMatch = valueText.match(/e-(\d+)$/);

  if (scientificMatch) {
    const exponent = Number(scientificMatch[1]);
    const mantissa = valueText.split('e-')[0] ?? '';
    const mantissaDecimals = mantissa.split('.')[1]?.length ?? 0;
    return exponent + mantissaDecimals;
  }

  return valueText.split('.')[1]?.length ?? 0;
}

export function getDecimalPlacesFromInputText(value: string): number {
  const trimmedValue = value.trim().toLowerCase();
  if (trimmedValue === '' || !Number.isFinite(Number(trimmedValue))) return 0;

  return getDecimalPlacesFromNormalizedText(trimmedValue);
}

function getPrecisionUnit(decimalPlaces: number): number {
  return 10 ** -decimalPlaces;
}

function formatRangeInputValue(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

function parseRangeInputValue(value: string): number | undefined {
  if (value.trim() === '') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function areNumericRangesEqual(
  left: [number, number] | undefined,
  right: [number, number] | undefined
): boolean {
  return left?.[0] === right?.[0] && left?.[1] === right?.[1];
}

function areRangeInputValuesEqual(left: [string, string], right: [string, string]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function getSliderBoundsForRange(range: [number, number], step: number): [number, number] {
  if (range[0] === range[1]) {
    return [range[0] - step, range[1] + step];
  }

  return range;
}

function mergeSliderBoundsWithRange(
  currentBounds: [number, number],
  nextRange: [number, number],
  step: number
): [number, number] {
  return getSliderBoundsForRange(
    [Math.min(currentBounds[0], nextRange[0]), Math.max(currentBounds[1], nextRange[1])],
    step
  );
}

function getPassivelyShrunkSliderBoundsForRange(
  currentBounds: [number, number],
  nextRange: [number, number],
  step: number
): [number, number] {
  // Only collapse stale headroom after blur, once a thumb has drifted far enough
  // away from its own edge to make the slider hard to use.
  if (!isRangeWithinBounds(nextRange, currentBounds)) {
    return mergeSliderBoundsWithRange(currentBounds, nextRange, step);
  }

  const [boundsMin, boundsMax] = currentBounds;
  const boundsWidth = boundsMax - boundsMin;

  if (boundsWidth <= 0) {
    return getSliderBoundsForRange(nextRange, step);
  }

  const lowerRatio = (nextRange[0] - boundsMin) / boundsWidth;
  const upperRatio = (nextRange[1] - boundsMin) / boundsWidth;
  const shouldShrinkMin = lowerRatio > PASSIVE_SLIDER_BOUND_RESET_THRESHOLD;
  const shouldShrinkMax = upperRatio < 1 - PASSIVE_SLIDER_BOUND_RESET_THRESHOLD;

  if (!shouldShrinkMin && !shouldShrinkMax) {
    return currentBounds;
  }

  return getSliderBoundsForRange(
    [shouldShrinkMin ? nextRange[0] : boundsMin, shouldShrinkMax ? nextRange[1] : boundsMax],
    step
  );
}

function isRangeWithinBounds(
  [rangeMin, rangeMax]: [number, number],
  [boundsMin, boundsMax]: [number, number]
): boolean {
  return rangeMin >= boundsMin && rangeMax <= boundsMax;
}

function clearTimeoutRef(timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>) {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }
}

function getParsedRangeFromInputValues(nextValues: [string, string]): [number, number] | undefined {
  const nextMin = parseRangeInputValue(nextValues[0]);
  const nextMax = parseRangeInputValue(nextValues[1]);

  if (nextMin == null || nextMax == null) {
    return undefined;
  }

  return [nextMin, nextMax];
}

export function getAdjustedRangeForInputChange(
  inputIndex: 0 | 1,
  nextValues: [string, string]
): [number, number] | undefined {
  const nextRange = getParsedRangeFromInputValues(nextValues);
  if (nextRange == null) {
    return undefined;
  }

  const [nextMin, nextMax] = nextRange;

  if (inputIndex === 0 && nextMin > nextMax) {
    return [nextMin, nextMin];
  }

  if (inputIndex === 1 && nextMax < nextMin) {
    return [nextMax, nextMax];
  }

  return [nextMin, nextMax];
}

function normalizeRange([min, max]: [number, number]): [number, number] {
  return min <= max ? [min, max] : [max, min];
}

export interface ProgressBarControlsProps {
  column: ColumnState;
  fillStyle: CellDecorationFillConfig;
  dataBounds: DataBounds;
  palette: PaletteOutput<CustomPaletteParams>;
  paletteService: PaletteRegistry;
  panelRef: MutableRefObject<HTMLDivElement | null>;
  appendLabel?: string;
  isInlineEditing?: boolean;
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
  appendLabel,
  isInlineEditing,
  onUpdate,
}: ProgressBarControlsProps) {
  const { fillMode } = fillStyle;
  const usesPalette = isPaletteFillMode(fillMode);
  const effectiveRange = getDecorationCustomRange(column, dataBounds);
  const isCustomRange = effectiveRange.mode === 'custom';
  const currentDomain = useMemo(
    () => getProgressBarDomain({ fillStyle, palette }, dataBounds),
    [dataBounds, fillStyle, palette]
  );
  const [sessionCustomRange, setSessionCustomRange] = useState<[number, number] | undefined>(() =>
    effectiveRange.mode === 'custom' &&
    typeof effectiveRange.min === 'number' &&
    Number.isFinite(effectiveRange.min) &&
    typeof effectiveRange.max === 'number' &&
    Number.isFinite(effectiveRange.max)
      ? normalizeRange([effectiveRange.min, effectiveRange.max])
      : undefined
  );

  useEffect(() => {
    if (
      effectiveRange.mode === 'custom' &&
      typeof effectiveRange.min === 'number' &&
      Number.isFinite(effectiveRange.min) &&
      typeof effectiveRange.max === 'number' &&
      Number.isFinite(effectiveRange.max)
    ) {
      const nextRange = normalizeRange([effectiveRange.min, effectiveRange.max]);
      setSessionCustomRange((currentRange) =>
        areNumericRangesEqual(currentRange, nextRange) ? currentRange : nextRange
      );
    }
  }, [effectiveRange.max, effectiveRange.min, effectiveRange.mode]);

  const setBarColor = useCallback(
    (nextFillMode: CellDecorationFillMode) => {
      if (nextFillMode === fillMode) return;

      const nextFillStyle: CellDecorationFillConfig = { ...fillStyle, fillMode: nextFillMode };
      const update: Partial<ColumnState> = {};
      const nextValueRange: CellDecorationValueRange =
        effectiveRange.mode === 'custom' && sessionCustomRange
          ? {
              mode: 'custom',
              min: sessionCustomRange[0],
              max: sessionCustomRange[1],
            }
          : { mode: effectiveRange.mode };

      if (nextFillMode === 'single') {
        nextFillStyle.color = fillStyle.color ?? DEFAULT_PROGRESS_BAR_COLOR;
        nextFillStyle.valueRange = nextValueRange;
      } else {
        nextFillStyle.valueRange = nextValueRange;
      }

      update.fillStyle = nextFillStyle;
      onUpdate(update);
    },
    [fillMode, fillStyle, effectiveRange, onUpdate, sessionCustomRange]
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

      // Seed Custom from the previously committed custom bounds when known,
      // otherwise from the current rendered domain.
      if (mode === 'custom') {
        const [min, max] = sessionCustomRange ?? [currentDomain.min, currentDomain.max];
        onUpdate({
          fillStyle: { ...fillStyle, valueRange: { mode: 'custom', min, max } },
        });
        return;
      }

      onUpdate({
        fillStyle: { ...fillStyle, valueRange: { mode: 'auto' } },
      });
    },
    [currentDomain, effectiveRange, fillStyle, onUpdate, sessionCustomRange]
  );

  const setCustomRange = useCallback(
    ([min, max]: [number, number]) => {
      // Persist the bounds on `fillStyle.valueRange` so the active progress-bar
      // range remains the source of truth regardless of the palette mode.
      const nextValueRange: CellDecorationValueRange = { mode: 'custom', min, max };
      setSessionCustomRange((currentRange) => {
        const nextRange: [number, number] = [min, max];
        return areNumericRangesEqual(currentRange, nextRange) ? currentRange : nextRange;
      });

      onUpdate({
        fillStyle: { ...fillStyle, valueRange: nextValueRange },
      });
    },
    [fillStyle, onUpdate]
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
    const sourceMin =
      effectiveRange.mode === 'custom' &&
      typeof effectiveRange.min === 'number' &&
      Number.isFinite(effectiveRange.min)
        ? effectiveRange.min
        : currentDomain.min;
    const sourceMax =
      effectiveRange.mode === 'custom' &&
      typeof effectiveRange.max === 'number' &&
      Number.isFinite(effectiveRange.max)
        ? effectiveRange.max
        : currentDomain.max;
    const lower = Number.isFinite(sourceMin) ? sourceMin : 0;
    const upper = Number.isFinite(sourceMax) ? sourceMax : lower + 1;
    return normalizeRange([lower, upper]);
  }, [
    currentDomain.max,
    currentDomain.min,
    effectiveRange.max,
    effectiveRange.min,
    effectiveRange.mode,
  ]);
  const rangeValueMin = rangeValue[0];
  const rangeValueMax = rangeValue[1];

  const datasetDecimalPlaces = useMemo(
    () => Math.max(getDecimalPlaces(dataBounds.min), getDecimalPlaces(dataBounds.max)),
    [dataBounds.max, dataBounds.min]
  );
  const basePrecisionUnit = useMemo(
    () =>
      getPrecisionUnit(
        Math.max(
          datasetDecimalPlaces,
          getDecimalPlaces(rangeValueMin),
          getDecimalPlaces(rangeValueMax)
        )
      ),
    [datasetDecimalPlaces, rangeValueMax, rangeValueMin]
  );
  const [draftRange, setDraftRange] = useState<[number, number]>([rangeValueMin, rangeValueMax]);
  const [focusedRangeInput, setFocusedRangeInput] = useState<0 | 1 | null>(null);
  const [rangeInputValues, setRangeInputValues] = useState<[string, string]>(() => [
    formatRangeInputValue(rangeValueMin),
    formatRangeInputValue(rangeValueMax),
  ]);
  const rangeInputValuesRef = useRef(rangeInputValues);
  const inputDecimalPlaces = useMemo(
    () =>
      Math.max(
        datasetDecimalPlaces,
        getDecimalPlacesFromInputText(rangeInputValues[0]),
        getDecimalPlacesFromInputText(rangeInputValues[1])
      ),
    [datasetDecimalPlaces, rangeInputValues]
  );
  const inputPrecisionUnit = useMemo(
    () => getPrecisionUnit(inputDecimalPlaces),
    [inputDecimalPlaces]
  );
  const [sliderBounds, setSliderBounds] = useState<[number, number]>(() =>
    getSliderBoundsForRange([rangeValueMin, rangeValueMax], basePrecisionUnit)
  );
  const wasCustomRange = useRef(isCustomRange);
  const manualInputSyncTimeout = useRef<ReturnType<typeof setTimeout>>();
  const draftOwner = useRef<'external' | 'input' | 'slider'>('external');
  const pendingCommittedRange = useRef<[number, number] | undefined>();
  const sliderGestureActive = useRef(false);
  const sliderGestureCleanup = useRef<(() => void) | undefined>();

  const clearSliderGestureListeners = useCallback(() => {
    sliderGestureCleanup.current?.();
    sliderGestureCleanup.current = undefined;
  }, []);

  const finishSliderGesture = useCallback(() => {
    sliderGestureActive.current = false;
    clearSliderGestureListeners();

    if (draftOwner.current === 'slider' && pendingCommittedRange.current == null) {
      draftOwner.current = 'external';
    }
  }, [clearSliderGestureListeners]);

  const beginSliderGesture = useCallback(() => {
    if (sliderGestureActive.current || typeof window === 'undefined') {
      return;
    }

    // Hold slider ownership for the full pointer gesture so prop sync cannot
    // snap the thumb back while the drag is still in progress.
    sliderGestureActive.current = true;

    const handleGestureEnd = () => {
      finishSliderGesture();
    };

    window.addEventListener('mouseup', handleGestureEnd);
    window.addEventListener('touchend', handleGestureEnd);
    window.addEventListener('touchcancel', handleGestureEnd);
    window.addEventListener('pointerup', handleGestureEnd);
    window.addEventListener('pointercancel', handleGestureEnd);

    sliderGestureCleanup.current = () => {
      window.removeEventListener('mouseup', handleGestureEnd);
      window.removeEventListener('touchend', handleGestureEnd);
      window.removeEventListener('touchcancel', handleGestureEnd);
      window.removeEventListener('pointerup', handleGestureEnd);
      window.removeEventListener('pointercancel', handleGestureEnd);
    };
  }, [finishSliderGesture]);

  useEffect(() => {
    return () => {
      clearTimeoutRef(manualInputSyncTimeout);
      clearSliderGestureListeners();
    };
  }, [clearSliderGestureListeners]);

  useEffect(() => {
    rangeInputValuesRef.current = rangeInputValues;
  }, [rangeInputValues]);

  useEffect(() => {
    const enteringCustom = isCustomRange && !wasCustomRange.current;
    wasCustomRange.current = isCustomRange;

    if (!isCustomRange) {
      return;
    }

    const nextRange: [number, number] = [rangeValueMin, rangeValueMax];
    const pendingRange = pendingCommittedRange.current;
    const pendingPropUpdate =
      pendingRange != null && !areNumericRangesEqual(pendingRange, nextRange);

    if (draftOwner.current === 'slider' && (sliderGestureActive.current || pendingPropUpdate)) {
      return;
    }

    if (
      draftOwner.current === 'input' &&
      focusedRangeInput !== null &&
      !areNumericRangesEqual(draftRange, nextRange)
    ) {
      return;
    }

    if (pendingRange && areNumericRangesEqual(pendingRange, nextRange)) {
      pendingCommittedRange.current = undefined;
      if (draftOwner.current === 'slider') {
        draftOwner.current = 'external';
      }
    }

    setDraftRange((currentRange) =>
      areNumericRangesEqual(currentRange, nextRange) ? currentRange : nextRange
    );
    setSliderBounds((currentBounds) => {
      if (!enteringCustom && isRangeWithinBounds(nextRange, currentBounds)) {
        return currentBounds;
      }

      const nextBounds = enteringCustom
        ? getSliderBoundsForRange(nextRange, basePrecisionUnit)
        : mergeSliderBoundsWithRange(currentBounds, nextRange, basePrecisionUnit);
      return areNumericRangesEqual(currentBounds, nextBounds) ? currentBounds : nextBounds;
    });
  }, [
    basePrecisionUnit,
    draftRange,
    focusedRangeInput,
    isCustomRange,
    rangeValueMax,
    rangeValueMin,
  ]);

  useEffect(() => {
    const normalizedDraftRange = normalizeRange(draftRange);
    const nextInputValues: [string, string] = [
      formatRangeInputValue(normalizedDraftRange[0]),
      formatRangeInputValue(normalizedDraftRange[1]),
    ];

    setRangeInputValues((currentValues) => {
      const syncedValues: [string, string] = [
        focusedRangeInput === 0 ? currentValues[0] : nextInputValues[0],
        focusedRangeInput === 1 ? currentValues[1] : nextInputValues[1],
      ];

      return areRangeInputValuesEqual(currentValues, syncedValues) ? currentValues : syncedValues;
    });
  }, [draftRange, focusedRangeInput]);

  const commitManualRangeToSlider = useCallback(
    (
      nextRange: [number, number],
      nextPrecisionUnit: number,
      options?: { allowPassiveShrink?: boolean }
    ) => {
      pendingCommittedRange.current = nextRange;
      setDraftRange((currentRange) =>
        areNumericRangesEqual(currentRange, nextRange) ? currentRange : nextRange
      );
      setSliderBounds((currentBounds) => {
        let nextBounds = currentBounds;

        if (options?.allowPassiveShrink) {
          nextBounds = getPassivelyShrunkSliderBoundsForRange(
            currentBounds,
            nextRange,
            nextPrecisionUnit
          );
        } else if (!isRangeWithinBounds(nextRange, currentBounds)) {
          nextBounds = mergeSliderBoundsWithRange(currentBounds, nextRange, nextPrecisionUnit);
        }

        return areNumericRangesEqual(currentBounds, nextBounds) ? currentBounds : nextBounds;
      });
      setCustomRange(nextRange);
    },
    [setCustomRange]
  );

  const syncManualRangeToSlider = useCallback(
    (nextRange: [number, number], nextPrecisionUnit: number) => {
      clearTimeoutRef(manualInputSyncTimeout);
      manualInputSyncTimeout.current = setTimeout(() => {
        manualInputSyncTimeout.current = undefined;
        commitManualRangeToSlider(nextRange, nextPrecisionUnit);
      }, MANUAL_INPUT_SYNC_DELAY_MS);
    },
    [commitManualRangeToSlider]
  );

  const handleRangeInputChange = useCallback(
    (inputIndex: 0 | 1, nextValue: string) => {
      draftOwner.current = 'input';
      pendingCommittedRange.current = undefined;
      finishSliderGesture();
      setFocusedRangeInput(inputIndex);
      const currentValues = rangeInputValuesRef.current;
      const nextValues: [string, string] =
        inputIndex === 0 ? [nextValue, currentValues[1]] : [currentValues[0], nextValue];
      const nextParsedRange = getParsedRangeFromInputValues(nextValues);
      const nextPrecisionUnit = getPrecisionUnit(
        Math.max(
          datasetDecimalPlaces,
          getDecimalPlacesFromInputText(nextValues[0]),
          getDecimalPlacesFromInputText(nextValues[1])
        )
      );

      setRangeInputValues(nextValues);
      rangeInputValuesRef.current = nextValues;

      if (!nextParsedRange) {
        clearTimeoutRef(manualInputSyncTimeout);
        return;
      }

      if (nextParsedRange[0] > nextParsedRange[1]) {
        clearTimeoutRef(manualInputSyncTimeout);
        return;
      }

      syncManualRangeToSlider(nextParsedRange, nextPrecisionUnit);
    },
    [datasetDecimalPlaces, finishSliderGesture, syncManualRangeToSlider]
  );

  const handleRangeInputBlur = useCallback(() => {
    const nextParsedRange = getParsedRangeFromInputValues(rangeInputValues);

    if (!nextParsedRange) {
      const nextValues: [string, string] = [
        formatRangeInputValue(draftRange[0]),
        formatRangeInputValue(draftRange[1]),
      ];
      draftOwner.current = 'external';
      setFocusedRangeInput(null);
      setRangeInputValues(nextValues);
      rangeInputValuesRef.current = nextValues;
      return;
    }

    const adjustedRange =
      focusedRangeInput != null
        ? getAdjustedRangeForInputChange(focusedRangeInput, rangeInputValues) ?? nextParsedRange
        : nextParsedRange;
    const nextPrecisionUnit = getPrecisionUnit(
      Math.max(
        datasetDecimalPlaces,
        getDecimalPlacesFromInputText(rangeInputValues[0]),
        getDecimalPlacesFromInputText(rangeInputValues[1])
      )
    );
    const nextValues: [string, string] = [
      formatRangeInputValue(adjustedRange[0]),
      formatRangeInputValue(adjustedRange[1]),
    ];

    clearTimeoutRef(manualInputSyncTimeout);
    commitManualRangeToSlider(adjustedRange, nextPrecisionUnit, { allowPassiveShrink: true });
    draftOwner.current = 'external';
    setFocusedRangeInput(null);
    setRangeInputValues(nextValues);
    rangeInputValuesRef.current = nextValues;
  }, [
    commitManualRangeToSlider,
    datasetDecimalPlaces,
    draftRange,
    focusedRangeInput,
    rangeInputValues,
  ]);

  const handleSliderChange = useCallback(
    (value: [number, number]) => {
      const nextRange = normalizeRange([Number(value[0]), Number(value[1])]);
      clearTimeoutRef(manualInputSyncTimeout);
      draftOwner.current = 'slider';
      pendingCommittedRange.current = nextRange;
      setFocusedRangeInput(null);
      setDraftRange((currentRange) =>
        areNumericRangesEqual(currentRange, nextRange) ? currentRange : nextRange
      );
      setCustomRange(nextRange);
    },
    [setCustomRange]
  );

  const normalizedDraftRange = useMemo<[number, number]>(
    () => normalizeRange(draftRange),
    [draftRange]
  );
  const [sliderBoundsMin, sliderBoundsMax] = sliderBounds;
  const sliderRangeWidth = sliderBoundsMax - sliderBoundsMin;
  const sliderValue = useMemo<[number, number]>(
    () => [normalizedDraftRange[0] - sliderBoundsMin, normalizedDraftRange[1] - sliderBoundsMin],
    [normalizedDraftRange, sliderBoundsMin]
  );
  const sliderStep = basePrecisionUnit;
  // Feed the slider a zero-based local coordinate space instead of large
  // absolute numbers so tiny ranges retain stable thumb movement.
  const levels = useMemo<EuiDualRangeProps['levels']>(() => {
    const clampActualValue = (value: number) =>
      Math.min(Math.max(value, sliderBoundsMin), sliderBoundsMax);
    const toSliderOffset = (value: number) => value - sliderBoundsMin;
    const paletteColors = palette.params?.stops?.map(({ color }) => color);
    const paletteStops = palette.name === 'custom' ? palette.params?.stops : undefined;
    if (usesPalette) {
      const stops = getProgressBarPaletteStops(
        paletteService,
        { min: normalizedDraftRange[0], max: normalizedDraftRange[1] },
        palette,
        paletteColors,
        paletteStops
      );

      if (stops.length) {
        return stops
          .map((stop, index) => {
            const nextStop = stops[index + 1]?.stop ?? normalizedDraftRange[1];

            return {
              min: toSliderOffset(clampActualValue(index === 0 ? sliderBoundsMin : stop.stop)),
              max: toSliderOffset(
                clampActualValue(index === stops.length - 1 ? sliderBoundsMax : nextStop)
              ),
              color: stop.color,
            };
          })
          .filter(({ min, max }) => min < max);
      }
    }
    return [
      {
        min: toSliderOffset(clampActualValue(normalizedDraftRange[0])),
        max: toSliderOffset(clampActualValue(normalizedDraftRange[1])),
        color: fillStyle.color ?? DEFAULT_PROGRESS_BAR_COLOR,
      },
    ];
  }, [
    fillStyle.color,
    normalizedDraftRange,
    palette,
    paletteService,
    sliderBoundsMax,
    sliderBoundsMin,
    usesPalette,
  ]);

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
          dataBounds={currentDomain}
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
        // Reserve the label column so the range inputs line up under the
        // "Value range" control above instead of starting at the panel edge.
        <EuiFormRow display="columnCompressed" fullWidth hasEmptyLabelSpace>
          <>
            <EuiFormControlLayoutDelimited
              css={valueRangeAppendCss}
              compressed
              fullWidth
              append={
                appendLabel ? (
                  <span
                    className="lnsDatatableProgressBarAppendLabel"
                    title={appendLabel}
                    data-test-subj="lnsDatatable_progressBar_valueRangeAppendLabel"
                  >
                    {appendLabel}
                  </span>
                ) : undefined
              }
              data-test-subj="lnsDatatable_progressBar_valueRangeInputs"
              startControl={
                <EuiFieldNumber
                  compressed
                  controlOnly
                  step={inputPrecisionUnit}
                  value={rangeInputValues[0]}
                  onFocus={() => setFocusedRangeInput(0)}
                  onBlur={handleRangeInputBlur}
                  onChange={(event) => handleRangeInputChange(0, event.target.value)}
                  aria-label={minValueRangeLabel}
                  data-test-subj="lnsDatatable_progressBar_valueRangeMin"
                />
              }
              endControl={
                <EuiFieldNumber
                  compressed
                  controlOnly
                  step={inputPrecisionUnit}
                  value={rangeInputValues[1]}
                  onFocus={() => setFocusedRangeInput(1)}
                  onBlur={handleRangeInputBlur}
                  onChange={(event) => handleRangeInputChange(1, event.target.value)}
                  aria-label={maxValueRangeLabel}
                  data-test-subj="lnsDatatable_progressBar_valueRangeMax"
                />
              }
            />
            <div
              onMouseDownCapture={beginSliderGesture}
              onTouchStartCapture={beginSliderGesture}
              onPointerDownCapture={beginSliderGesture}
            >
              <EuiDualRange
                id={`${idPrefix}valueRangeSlider`}
                min={0}
                max={sliderRangeWidth}
                step={sliderStep}
                value={sliderValue}
                onChange={(value) =>
                  handleSliderChange([
                    sliderBoundsMin + Number(value[0]),
                    sliderBoundsMin + Number(value[1]),
                  ])
                }
                showInput={false}
                // The numeric inputs above are the source of truth. Leaving
                // the built-in labels on squeezes the track for long values.
                levels={levels}
                fullWidth
                compressed
                aria-label={valueRangeLabel}
                data-test-subj="lnsDatatable_progressBar_valueRangeSlider"
              />
            </div>
          </>
        </EuiFormRow>
      )}
    </>
  );
}
