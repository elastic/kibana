/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import { useDownsamplingColors } from '../../hooks/use_downsampling_colors';
import type { DownsamplingSegment } from './data_lifecycle_segments';
import { DownsamplingPhase } from './downsampling_phase';
import { useDownsamplingBarStyles } from './downsampling_bar_styles';
import { useGridColumnsTransitionCss } from './lifecycle_bar_animations';

const noDownsamplingLabel = i18n.translate('xpack.streams.dataLifecycleSummary.noDownsampling', {
  defaultMessage: 'No downsampling',
});

export const getDownsamplingLayout = (segments: DownsamplingSegment[], columnStarts?: number[]) => {
  const columnStartOf = (index: number) => columnStarts?.[index] ?? index + 1;

  const deleteIndex = segments.findIndex((segment) => segment.isDelete);
  const lastColumn = segments.reduce((max, _, index) => Math.max(max, columnStartOf(index)), 1);
  const spanEndColumn =
    deleteIndex === -1 ? lastColumn : Math.max(columnStartOf(deleteIndex) - 1, 1);

  const stepIndices = segments
    .map((segment, index) => (segment.step && !segment.isDelete ? index : -1))
    .filter((index) => index !== -1);

  if (stepIndices.length === 0) {
    return segments.map((segment, index) => ({
      segment,
      span: 1,
      hidden: false,
      columnStart: columnStartOf(index),
    }));
  }

  const lastStepIndex = stepIndices[stepIndices.length - 1];
  const firstStepColumn = columnStartOf(stepIndices[0]);

  // Each step spans up to the next step's column (covering non-step columns in between, e.g. frozen);
  // the last step spans to before delete. Covered columns are hidden so they don't overlap the bar.
  const nextStepByIndex = (index: number): number | undefined =>
    stepIndices.find((stepIndex) => stepIndex > index);

  return segments.map((segment, index) => {
    const columnStart = columnStartOf(index);

    if (segment.isDelete) {
      return { segment, span: 1, hidden: false, columnStart };
    }

    if (segment.step) {
      const span =
        index === lastStepIndex
          ? Math.max(spanEndColumn - columnStart + 1, 1)
          : Math.max(columnStartOf(nextStepByIndex(index) ?? index) - columnStart, 1);
      return { segment, span, hidden: false, columnStart };
    }

    // Non-step column: hide it if it falls within a step's span (i.e. before the last covered
    // column), otherwise render it as-is.
    const hidden = columnStart <= spanEndColumn && columnStart > firstStepColumn;
    return { segment, span: 1, hidden, columnStart };
  });
};

export interface DownsamplingBarProps {
  segments: DownsamplingSegment[];
  gridTemplateColumns: string;
  columnStarts?: number[];
  animateGridChanges?: boolean;
  onRemoveStep?: (stepNumber: number) => void;
  onEditStep?: (stepNumber: number, phaseName?: string) => void;
  editedPhaseName?: string;
  editedDownsampleStepIndex?: number;
  canManageLifecycle: boolean;
  isEditLifecycleFlyoutOpen?: boolean;
  /** While true, all click interactions are disabled: no popover opens and no navigation occurs. */
  disableInteractions?: boolean;
}

export const DownsamplingBar = ({
  segments,
  gridTemplateColumns,
  columnStarts,
  animateGridChanges = true,
  onRemoveStep,
  onEditStep,
  editedPhaseName,
  editedDownsampleStepIndex,
  canManageLifecycle,
  isEditLifecycleFlyoutOpen,
  disableInteractions,
}: DownsamplingBarProps) => {
  const { euiTheme } = useEuiTheme();
  const gridColumnsTransitionCss = useGridColumnsTransitionCss(
    euiTheme,
    gridTemplateColumns,
    animateGridChanges
  );
  const phaseColors = usePhaseColors();
  const { getDownsamplingColor } = useDownsamplingColors();

  const hasDownsamplingSteps = segments.some((segment) => Boolean(segment.step));

  const layout = getDownsamplingLayout(segments, columnStarts);

  const {
    containerCss,
    gridCss,
    emptyFlexItemCss,
    emptyPanelCss,
    emptyLabelCss,
    segmentFlexItemCss,
    deletePanelCss,
    transparentPanelCss,
  } = useDownsamplingBarStyles({
    gridTemplateColumns,
    hasDownsamplingSteps,
    deletePanelColor: phaseColors.delete,
  });

  return (
    <>
      <EuiSpacer size="s" />
      <EuiText size="xs" color="subdued" data-test-subj="downsamplingBar-label">
        {i18n.translate('xpack.streams.dataLifecycleSummary.downsamplingStepsLabel', {
          defaultMessage: 'Downsample steps',
        })}
      </EuiText>
      <EuiSpacer size="xs" />
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        data-test-subj="downsamplingBar-container"
        css={containerCss}
      >
        <EuiFlexGrid
          columns={1}
          gutterSize="none"
          responsive={false}
          css={[gridCss, gridColumnsTransitionCss]}
        >
          {!hasDownsamplingSteps ? (
            <EuiFlexItem grow={false} css={emptyFlexItemCss}>
              <EuiPanel
                paddingSize="none"
                hasBorder={false}
                hasShadow={false}
                data-test-subj="downsamplingBar-empty"
                css={emptyPanelCss}
              >
                <EuiText size="xs" color="subdued">
                  <span data-test-subj="downsamplingBar-emptyLabel" css={emptyLabelCss}>
                    {noDownsamplingLabel}
                  </span>
                </EuiText>
              </EuiPanel>
            </EuiFlexItem>
          ) : (
            layout.map(({ segment, span, hidden, columnStart }, index) => {
              if (hidden) {
                return null;
              }

              if (segment.step) {
                // Key by stable identity (not index) so the cell isn't remounted and its width animates.
                const stepIdentity =
                  segment.phaseName ?? `${segment.step.after ?? ''}-${segment.step.fixed_interval}`;
                const stepIndex = segment.stepIndex ?? index;

                return (
                  <EuiFlexItem
                    key={`step-${stepIdentity}`}
                    grow={segment.grow}
                    css={[segmentFlexItemCss, { gridColumn: `${columnStart} / span ${span}` }]}
                  >
                    <DownsamplingPhase
                      downsample={segment.step}
                      stepNumber={stepIndex + 1}
                      phaseName={segment.phaseName}
                      color={getDownsamplingColor(stepIndex)}
                      onRemoveStep={onRemoveStep}
                      onEditStep={onEditStep}
                      isBeingEdited={Boolean(
                        (editedPhaseName &&
                          segment.phaseName &&
                          segment.phaseName === editedPhaseName) ||
                          (editedDownsampleStepIndex !== undefined &&
                            segment.stepIndex === editedDownsampleStepIndex)
                      )}
                      canManageLifecycle={canManageLifecycle}
                      isEditLifecycleFlyoutOpen={isEditLifecycleFlyoutOpen}
                      disableInteractions={disableInteractions}
                    />
                  </EuiFlexItem>
                );
              }

              return (
                <EuiFlexItem
                  key={`col-${columnStart}`}
                  grow={segment.grow}
                  css={[segmentFlexItemCss, { gridColumn: `${columnStart} / span ${span}` }]}
                >
                  {segment.isDelete ? (
                    <EuiPanel
                      paddingSize="s"
                      hasBorder={false}
                      hasShadow={false}
                      css={deletePanelCss}
                    />
                  ) : (
                    <EuiPanel
                      paddingSize="none"
                      hasBorder={false}
                      hasShadow={false}
                      css={transparentPanelCss}
                    />
                  )}
                </EuiFlexItem>
              );
            })
          )}
        </EuiFlexGrid>
      </EuiPanel>
    </>
  );
};
