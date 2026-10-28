/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseEuiTheme } from '@elastic/eui';
import { EuiRadio, EuiText, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
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
const COMPARE_TILE_ILLUSTRATION_HEIGHT = 58;
const COMPARE_TILE_FOOTER_HEIGHT = 41;
const TILE_GAP = 16;
const TILE_FOOTER_PADDING_X = 10;
const PANEL_SECTION_PADDING = 16;
const SECTION_LABEL_GAP = 8;

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
  title: css`
    ${changeHistoryPreviewTypography}
    margin: 0;
    font-weight: var(--Font-weight-Semi-bold, 600);
    font-size: 14px;
    line-height: 20px;
  `,
  tileGroup: css({
    display: 'flex',
    flexWrap: 'wrap',
    gap: `${TILE_GAP}px`,
  }),
  tile: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      flexDirection: 'column',
      width: `${COMPARE_TILE_WIDTH}px`,
      border: euiTheme.border.thin,
      borderRadius: '8px',
      overflow: 'hidden',
      backgroundColor: euiTheme.colors.backgroundBasePlain,
    }),
  tileSelected: ({ euiTheme }: UseEuiTheme) =>
    css({
      borderColor: euiTheme.colors.borderBasePrimary,
      backgroundColor: euiTheme.colors.backgroundBaseInteractiveSelect,
    }),
  tileIllustration: ({ euiTheme }: UseEuiTheme) =>
    css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: `${COMPARE_TILE_ILLUSTRATION_HEIGHT}px`,
      borderBottom: euiTheme.border.thin,
      cursor: 'pointer',
    }),
  tileFooter: css({
    display: 'flex',
    alignItems: 'center',
    height: `${COMPARE_TILE_FOOTER_HEIGHT}px`,
    padding: `0 ${TILE_FOOTER_PADDING_X}px`,
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
  const radioGroupName = useGeneratedHtmlId({ prefix: 'changeHistoryCompareMode' });
  const groupLabelId = useGeneratedHtmlId({ prefix: 'changeHistoryCompareModeGroup' });

  return (
    <EuiText component="div" css={styles.compareSection}>
      <EuiText component="span" css={styles.title} id={groupLabelId}>
        {i18n.translate('xpack.changeHistoryUi.preview.settings.comparisonMode', {
          defaultMessage: 'Comparison mode',
        })}
      </EuiText>
      <div role="radiogroup" aria-labelledby={groupLabelId} css={styles.tileGroup}>
        {modes.map(({ id, label, icon, 'data-test-subj': testSubj }) => {
          const inputId = `${radioGroupName}-${id}`;
          const isSelected = selectedModeId === id;

          return (
            <div key={id} css={[styles.tile, isSelected && styles.tileSelected]}>
              <label htmlFor={inputId} aria-hidden={true} css={styles.tileIllustration}>
                {icon}
              </label>
              <div css={styles.tileFooter}>
                <EuiRadio
                  id={inputId}
                  name={radioGroupName}
                  label={label}
                  checked={isSelected}
                  // Intentionally keep the popover open so users can switch unified/split without reopening.
                  onChange={() => onModeChange(id)}
                  labelProps={{ 'data-test-subj': testSubj }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </EuiText>
  );
};
