/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import { useDownsamplingColors } from '../../hooks/use_downsampling_colors';
import type { DownsamplingSegment } from './data_lifecycle_segments';
import { DownsamplingPhase } from './downsampling_phase';

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
  segments?: DownsamplingSegment[] | null;
  gridTemplateColumns: string;
  onRemoveStep?: (stepNumber: number) => void;
  onEditStep?: (stepNumber: number, phaseName?: string) => void;
  editedPhaseName?: string;
  editedDownsampleStepIndex?: number;
  canManageLifecycle: boolean;
  isEditLifecycleFlyoutOpen?: boolean;
}

const useDownsamplingBarStyles = ({
  gridTemplateColumns,
  hasDownsamplingSteps,
}: {
  gridTemplateColumns: string;
  hasDownsamplingSteps: boolean;
}) => {
  const { euiTheme } = useEuiTheme();

  return useMemo(() => {
    const containerCss = css`
      background-color: ${hasDownsamplingSteps
        ? euiTheme.colors.backgroundBaseSubdued
        : 'transparent'};
      border-radius: ${hasDownsamplingSteps ? '8px' : '0'};
      padding: ${hasDownsamplingSteps ? '4px 2px' : '0'};
      border: none;
    `;

    const gridCss = css`
      grid-template-columns: ${gridTemplateColumns};
      padding-inline: ${euiTheme.size.xxs};
      box-sizing: border-box;
    `;

    const emptyFlexItemCss = css`
      display: flex;
      flex-basis: 0;
      min-width: 0;
      grid-column: 1 / -1;
      padding-block: ${euiTheme.size.xxs};
      padding-inline: ${euiTheme.size.xxs};
      box-sizing: border-box;
    `;

    const emptyPanelCss = css`
      padding-block: ${euiTheme.size.m};
      position: relative;
      box-sizing: border-box;
      width: 100%;
      border-radius: 8px;
      background-image: repeating-linear-gradient(
        -45deg,
        ${euiTheme.colors.backgroundBaseSubdued},
        ${euiTheme.colors.backgroundBaseSubdued} 25%,
        ${euiTheme.colors.backgroundBasePlain} 25%,
        ${euiTheme.colors.backgroundBasePlain} 50%,
        ${euiTheme.colors.backgroundBaseSubdued} 50%
      );
      background-size: ${euiTheme.size.xs} ${euiTheme.size.xs};
      text-align: center;
    `;

    const emptyLabelCss = css`
      line-height: ${euiTheme.size.base};
      display: inline-block;
    `;

    return { euiTheme, containerCss, gridCss, emptyFlexItemCss, emptyPanelCss, emptyLabelCss };
  }, [euiTheme, gridTemplateColumns, hasDownsamplingSteps]);
};

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

  const hasDownsamplingSteps = Boolean(segments?.some((segment) => Boolean(segment.step)));
  const noDownsamplingLabel = i18n.translate('xpack.streams.dataLifecycleSummary.noDownsampling', {
    defaultMessage: 'No downsampling',
  });

  const { euiTheme, containerCss, gridCss, emptyFlexItemCss, emptyPanelCss, emptyLabelCss } =
    useDownsamplingBarStyles({ gridTemplateColumns, hasDownsamplingSteps });

  if (!segments) {
    return null;
  }

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
                  css={{
                    display: 'flex',
                    flexBasis: 0,
                    minWidth: 0,
                    gridColumn: `${columnStart} / span ${span}`,
                    paddingBlock: euiTheme.size.xxs,
                    paddingInline: euiTheme.size.xxs,
                    boxSizing: 'border-box',
                    justifyContent: 'center',
                  }}
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
                      css={{
                        backgroundColor: phaseColors.delete,
                        borderRadius: euiTheme.border.radius.small,
                        minHeight: '30px',
                        height: '100%',
                        width: '100%',
                      }}
                    />
                  ) : (
                    <EuiPanel
                      paddingSize="none"
                      hasBorder={false}
                      hasShadow={false}
                      css={{
                        backgroundColor: 'transparent',
                        minHeight: '30px',
                        height: '100%',
                        width: '100%',
                      }}
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
