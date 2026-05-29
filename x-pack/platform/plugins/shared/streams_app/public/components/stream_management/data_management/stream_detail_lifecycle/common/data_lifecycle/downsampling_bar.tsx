/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import { useDownsamplingColors } from '../../hooks/use_downsampling_colors';
import type { DownsamplingSegment } from './data_lifecycle_segments';
import { DownsamplingPhase } from './downsampling_phase';
import { useDownsamplingBarStyles } from './downsampling_bar_styles';

const noDownsamplingLabel = i18n.translate('xpack.streams.dataLifecycleSummary.noDownsampling', {
  defaultMessage: 'No downsampling',
});

const getDownsamplingLayout = (segments: DownsamplingSegment[]) => {
  const deleteIndex = segments.findIndex((segment) => segment.isDelete);
  const spanEndIndex = deleteIndex === -1 ? segments.length - 1 : Math.max(deleteIndex - 1, 0);

  // Find all step indices (segments with downsample steps, excluding delete)
  const stepIndices = segments
    .map((segment, index) => (segment.step && !segment.isDelete ? index : -1))
    .filter((index) => index !== -1);

  if (stepIndices.length === 0) {
    return segments.map((segment, index) => ({
      segment,
      span: 1,
      hidden: false,
      columnStart: index + 1,
    }));
  }

  const firstStepIndex = stepIndices[0];
  const secondStepIndex = stepIndices.length > 1 ? stepIndices[1] : null;
  const lastStepIndex = stepIndices[stepIndices.length - 1];

  return segments.map((segment, index) => {
    const columnStart = index + 1;

    // Handle delete segment
    if (segment.isDelete) {
      return { segment, span: 1, hidden: false, columnStart };
    }

    // First step: span until second step (or until last step logic takes over if only one step)
    if (index === firstStepIndex && secondStepIndex !== null && firstStepIndex !== lastStepIndex) {
      const span = secondStepIndex - firstStepIndex;
      return { segment, span, hidden: false, columnStart };
    }

    // Hide segments between first and second step
    if (
      secondStepIndex !== null &&
      index > firstStepIndex &&
      index < secondStepIndex &&
      firstStepIndex !== lastStepIndex
    ) {
      return { segment, span: 1, hidden: true, columnStart };
    }

    // Last step: span until end (before delete)
    if (index === lastStepIndex) {
      const span = Math.max(spanEndIndex - lastStepIndex + 1, 1);
      return { segment, span, hidden: false, columnStart };
    }

    // Hide segments between last step and end
    if (index > lastStepIndex && index <= spanEndIndex) {
      return { segment, span: 1, hidden: true, columnStart };
    }

    return { segment, span: 1, hidden: false, columnStart };
  });
};

export interface DownsamplingBarProps {
  segments: DownsamplingSegment[];
  gridTemplateColumns: string;
  onRemoveStep?: (stepNumber: number) => void;
  onEditStep?: (stepNumber: number, phaseName?: string) => void;
  editedPhaseName?: string;
  editedDownsampleStepIndex?: number;
  canManageLifecycle: boolean;
  isEditLifecycleFlyoutOpen?: boolean;
}

export const DownsamplingBar = ({
  segments,
  gridTemplateColumns,
  onRemoveStep,
  onEditStep,
  editedPhaseName,
  editedDownsampleStepIndex,
  canManageLifecycle,
  isEditLifecycleFlyoutOpen,
}: DownsamplingBarProps) => {
  const phaseColors = usePhaseColors();
  const { getDownsamplingColor } = useDownsamplingColors();

  const hasDownsamplingSteps = segments.some((segment) => Boolean(segment.step));

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
        <EuiFlexGrid columns={1} gutterSize="none" responsive={false} css={gridCss}>
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
            getDownsamplingLayout(segments).map(({ segment, span, hidden, columnStart }, index) => {
              if (hidden) {
                return null;
              }

              return (
                <EuiFlexItem
                  key={index}
                  grow={segment.grow}
                  css={[segmentFlexItemCss, { gridColumn: `${columnStart} / span ${span}` }]}
                >
                  {segment.step ? (
                    <DownsamplingPhase
                      downsample={segment.step}
                      stepNumber={(segment.stepIndex ?? index) + 1}
                      phaseName={segment.phaseName}
                      color={getDownsamplingColor(segment.stepIndex ?? index)}
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
                    />
                  ) : segment.isDelete ? (
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
