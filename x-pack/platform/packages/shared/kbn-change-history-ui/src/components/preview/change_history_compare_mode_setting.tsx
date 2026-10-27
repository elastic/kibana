/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiText, useEuiTheme, useGeneratedHtmlId, transparentize } from '@elastic/eui';
import { ClassNames, css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useCallback, useMemo, useRef } from 'react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { i18n } from '@kbn/i18n';
import type { ChangeHistoryCompareMode } from '../../telemetry';
import { changeHistoryPreviewTypography } from './change_history_preview_typography';

export type ChangeHistoryDiffViewMode = ChangeHistoryCompareMode;

/** A selectable entry in the mode setting. */
export interface ChangeHistoryPreviewModeOption {
  id: string;
  label: string;
  /** Illustration rendered in the tile; sized for roughly 80x58px. Decorative (hidden from assistive tech). */
  icon: ReactNode;
  'data-test-subj'?: string;
}

const DIFF_MODE_TEST_SUBJ: Record<ChangeHistoryDiffViewMode, string> = {
  unified: 'changeHistoryCompareUnified',
  split: 'changeHistoryCompareSplit',
};

const COMPARE_TILE_WIDTH = 110;
const COMPARE_TILE_HEIGHT = 100;
const COMPARE_TILE_ILLUSTRATION_HEIGHT = 58;
const COMPARE_TILE_FOOTER_HEIGHT = COMPARE_TILE_HEIGHT - COMPARE_TILE_ILLUSTRATION_HEIGHT - 1;
const PANEL_SECTION_PADDING = 16;
const SECTION_LABEL_GAP = 8;
const TILE_GAP = 16;
const TILE_FOOTER_PADDING_X = 10;
const SELECTED_TILE_TINT_ALPHA = 0.04;

const ILLUSTRATION_BAR_HEIGHT = 8;
const ILLUSTRATION_BAR_GROUP_HEIGHT = 36;
const ILLUSTRATION_BAR_TOP = (COMPARE_TILE_ILLUSTRATION_HEIGHT - ILLUSTRATION_BAR_GROUP_HEIGHT) / 2;
const ILLUSTRATION_BAR_ROW_OFFSETS = [0, 14, 28] as const;

interface CompareModeIllustrationProps {
  mode: ChangeHistoryDiffViewMode;
  borderColor: string;
  addedColor: string;
  removedColor: string;
}

const CompareModeIllustration = ({
  mode,
  borderColor,
  addedColor,
  removedColor,
}: CompareModeIllustrationProps): JSX.Element => {
  const barY = (rowIndex: number): number =>
    ILLUSTRATION_BAR_TOP + ILLUSTRATION_BAR_ROW_OFFSETS[rowIndex];

  if (mode === 'unified') {
    return (
      <svg
        width="80"
        height={COMPARE_TILE_ILLUSTRATION_HEIGHT}
        viewBox={`0 0 80 ${COMPARE_TILE_ILLUSTRATION_HEIGHT}`}
        aria-hidden={true}
        data-test-subj={`changeHistoryCompareIllustration-${mode}`}
      >
        <rect
          x="0"
          y={barY(0)}
          width="80"
          height={ILLUSTRATION_BAR_HEIGHT}
          rx="4"
          fill={addedColor}
        />
        <rect
          x="0"
          y={barY(1)}
          width="60"
          height={ILLUSTRATION_BAR_HEIGHT}
          rx="4"
          fill={addedColor}
        />
        <rect
          x="0"
          y={barY(2)}
          width="80"
          height={ILLUSTRATION_BAR_HEIGHT}
          rx="4"
          fill={removedColor}
        />
      </svg>
    );
  }

  return (
    <svg
      width="86"
      height={COMPARE_TILE_ILLUSTRATION_HEIGHT}
      viewBox={`0 0 86 ${COMPARE_TILE_ILLUSTRATION_HEIGHT}`}
      aria-hidden={true}
      data-test-subj={`changeHistoryCompareIllustration-${mode}`}
    >
      <line
        x1="43"
        y1="0"
        x2="43"
        y2={COMPARE_TILE_ILLUSTRATION_HEIGHT}
        stroke={borderColor}
        strokeWidth="1"
      />
      <rect
        x="0"
        y={barY(0)}
        width="33"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={addedColor}
      />
      <rect
        x="53"
        y={barY(0)}
        width="32"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={removedColor}
      />
      <rect
        x="0"
        y={barY(1)}
        width="33"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={addedColor}
      />
      <rect
        x="53"
        y={barY(1)}
        width="32"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={removedColor}
      />
      <rect
        x="0"
        y={barY(2)}
        width="26"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={addedColor}
      />
      <rect
        x="53"
        y={barY(2)}
        width="26"
        height={ILLUSTRATION_BAR_HEIGHT}
        rx="4"
        fill={removedColor}
      />
    </svg>
  );
};

/** Built-in unified / split options, in display order. */
export const useChangeHistoryDiffModeOptions = (): ChangeHistoryPreviewModeOption[] => {
  const { euiTheme } = useEuiTheme();
  const { borderBasePlain } = euiTheme.colors;
  const { success, danger } = euiTheme.colors;

  return useMemo(
    () =>
      (['unified', 'split'] as const).map((mode) => ({
        id: mode,
        label:
          mode === 'unified'
            ? i18n.translate('xpack.changeHistoryUi.preview.settings.unified', {
                defaultMessage: 'Unified',
              })
            : i18n.translate('xpack.changeHistoryUi.preview.settings.split', {
                defaultMessage: 'Split',
              }),
        icon: (
          <CompareModeIllustration
            mode={mode}
            borderColor={borderBasePlain}
            addedColor={success}
            removedColor={danger}
          />
        ),
        'data-test-subj': DIFF_MODE_TEST_SUBJ[mode],
      })),
    [borderBasePlain, success, danger]
  );
};

const compareModeSettingStyles = {
  compareSection: () =>
    css({
      display: 'flex',
      flexDirection: 'column',
      gap: `${SECTION_LABEL_GAP}px`,
      padding: `${PANEL_SECTION_PADDING}px`,
    }),
  sectionLabel: css({
    fontWeight: 400,
    fontSize: '14px',
    lineHeight: '20px',
    color: 'inherit',
  }),
  title: css`
    ${changeHistoryPreviewTypography}
    margin: 0;
    font-weight: var(--Font-weight-Semi-bold, 600);
    font-size: 14px;
    line-height: 20px;
  `,
  compareTileGroup: css({
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: `${COMPARE_TILE_WIDTH}px`,
    gap: `${TILE_GAP}px`,
    width: 'fit-content',
  }),
  compareTile: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      width: `${COMPARE_TILE_WIDTH}px`,
      height: `${COMPARE_TILE_HEIGHT}px`,
      minWidth: `${COMPARE_TILE_WIDTH}px`,
      maxWidth: `${COMPARE_TILE_WIDTH}px`,
      padding: 0,
      border: euiTheme.border.thin,
      borderRadius: '8px',
      overflow: 'hidden',
      cursor: 'pointer',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      textAlign: 'left',
      appearance: 'none',
      font: 'inherit',
      color: 'inherit',

      '&:focus-visible': {
        outline: `${euiTheme.focus.width} solid ${euiTheme.focus.color}`,
        outlineOffset: 0,
      },
    }),
  compareTileSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderColor: euiTheme.colors.borderBasePrimary,
    }),
  compareTileSelectedOverlay: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'absolute',
      inset: 0,
      zIndex: 0,
      borderRadius: '7px',
      backgroundColor: transparentize(euiTheme.colors.primary, SELECTED_TILE_TINT_ALPHA),
      pointerEvents: 'none',
    }),
  compareTileIllustration: css({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: `0 0 ${COMPARE_TILE_ILLUSTRATION_HEIGHT}px`,
    width: '100%',
    height: `${COMPARE_TILE_ILLUSTRATION_HEIGHT}px`,
    overflow: 'hidden',

    svg: {
      display: 'block',
      flexShrink: 0,
    },
  }),
  compareTileDivider: ({ euiTheme }: UseEuiTheme) =>
    css({
      position: 'relative',
      zIndex: 1,
      flexShrink: 0,
      height: '1px',
      width: '100%',
      backgroundColor: euiTheme.colors.borderBasePlain,
    }),
  compareTileFooter: css({
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flex: `0 0 ${COMPARE_TILE_FOOTER_HEIGHT}px`,
    alignItems: 'center',
    gap: '6px',
    width: '100%',
    height: `${COMPARE_TILE_FOOTER_HEIGHT}px`,
    padding: `0 ${TILE_FOOTER_PADDING_X}px`,
    boxSizing: 'border-box',
  }),
  radioCircle: ({ euiTheme }: UseEuiTheme) =>
    css({
      width: '16px',
      height: '16px',
      flexShrink: 0,
      borderRadius: '50%',
      border: `1px solid ${euiTheme.colors.borderBasePlain}`,
      backgroundColor: euiTheme.colors.backgroundBasePlain,
      boxSizing: 'border-box',
    }),
  radioCircleSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderColor: euiTheme.colors.primary,
      backgroundColor: euiTheme.colors.primary,
      boxShadow: `inset 0 0 0 3px ${euiTheme.colors.backgroundBasePlain}`,
    }),
  compareTileLabel: ({ euiTheme }: UseEuiTheme) =>
    css({
      fontWeight: euiTheme.font.weight.bold,
      fontSize: '14px',
      lineHeight: '20px',
      color: euiTheme.colors.textParagraph,
    }),
};

export interface ChangeHistoryCompareModeSettingProps {
  /** Modes to offer, in display order. */
  modes: readonly ChangeHistoryPreviewModeOption[];
  selectedModeId: string;
  onModeChange: (modeId: string) => void;
}

/** Mode picker (built-in unified / split plus any custom modes). Render it inside a settings popover section. */
export const ChangeHistoryCompareModeSetting = ({
  modes,
  selectedModeId,
  onModeChange,
}: ChangeHistoryCompareModeSettingProps): JSX.Element => {
  const styles = useMemoCss(compareModeSettingStyles);
  const tileRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const compareModeGroupLabelId = useGeneratedHtmlId({
    prefix: 'changeHistoryCompareModeGroup',
  });

  const focusCompareTile = useCallback((modeId: string): void => {
    tileRefs.current[modeId]?.focus();
  }, []);

  const selectCompareMode = useCallback(
    (modeId: string, shouldFocus = false): void => {
      onModeChange(modeId);
      // Intentionally keep the popover open so users can switch unified/split without reopening.
      if (shouldFocus) {
        focusCompareTile(modeId);
      }
    },
    [focusCompareTile, onModeChange]
  );

  const handleCompareTileKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, modeId: string): void => {
      const currentIndex = modes.findIndex(({ id }) => id === selectedModeId);

      switch (event.key) {
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          selectCompareMode(modes[Math.max(0, currentIndex - 1)].id, true);
          return;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          selectCompareMode(modes[Math.min(modes.length - 1, currentIndex + 1)].id, true);
          return;
        case 'Home':
          event.preventDefault();
          selectCompareMode(modes[0].id, true);
          return;
        case 'End':
          event.preventDefault();
          selectCompareMode(modes[modes.length - 1].id, true);
          return;
        case ' ':
        case 'Enter':
          event.preventDefault();
          selectCompareMode(modeId, true);
      }
    },
    [modes, selectedModeId, selectCompareMode]
  );

  const renderCompareTile = ({
    id,
    label,
    icon,
    'data-test-subj': testSubj,
  }: ChangeHistoryPreviewModeOption): JSX.Element => {
    const isSelected = selectedModeId === id;

    return (
      <ClassNames>
        {({ css: cssClassName }) => (
          <button
            key={id}
            ref={(element) => {
              tileRefs.current[id] = element;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            tabIndex={isSelected ? 0 : -1}
            className={cssClassName(styles.compareTile, isSelected && styles.compareTileSelected)}
            data-test-subj={testSubj}
            aria-label={label}
            onClick={() => selectCompareMode(id)}
            onKeyDown={(event: React.KeyboardEvent<HTMLButtonElement>) =>
              handleCompareTileKeyDown(event, id)
            }
          >
            {isSelected ? (
              <EuiText
                component="span"
                css={styles.compareTileSelectedOverlay}
                aria-hidden={true}
              />
            ) : null}
            <EuiText component="span" css={styles.compareTileIllustration} aria-hidden={true}>
              {icon}
            </EuiText>
            <EuiText component="span" css={styles.compareTileDivider} aria-hidden={true} />
            <EuiText component="span" css={styles.compareTileFooter}>
              <EuiText
                component="span"
                css={[styles.radioCircle, isSelected && styles.radioCircleSelected]}
                aria-hidden={true}
              />
              <EuiText component="span" css={styles.compareTileLabel}>
                {label}
              </EuiText>
            </EuiText>
          </button>
        )}
      </ClassNames>
    );
  };

  return (
    <EuiText component="div" css={styles.compareSection}>
      <EuiText component="span" css={styles.title} id={compareModeGroupLabelId}>
        {i18n.translate('xpack.changeHistoryUi.preview.settings.comparisonMode', {
          defaultMessage: 'Comparison mode',
        })}
      </EuiText>
      <EuiText
        component="div"
        css={styles.compareTileGroup}
        role="radiogroup"
        aria-labelledby={compareModeGroupLabelId}
      >
        {modes.map(renderCompareTile)}
      </EuiText>
    </EuiText>
  );
};
