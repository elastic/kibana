/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGrid, EuiFlexItem, EuiPanel, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
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
  canManageLifecycle: boolean;
}

export const DownsamplingBar = ({
  segments,
  gridTemplateColumns,
  onRemoveStep,
  canManageLifecycle,
}: DownsamplingBarProps) => {
  const { euiTheme } = useEuiTheme();
  const { getDownsamplingColor } = useDownsamplingColors();

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
        style={{
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          borderRadius: '8px',
          padding: '4px 2px',
        }}
      >
        <EuiFlexGrid
          columns={1}
          gutterSize="none"
          responsive={false}
          css={{
            gridTemplateColumns,
            paddingRight: euiTheme.size.xs,
            boxSizing: 'border-box',
          }}
        >
          {getDownsamplingLayout(segments).map(({ segment, span, hidden, columnStart }, index) => {
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
                    canManageLifecycle={canManageLifecycle}
                  />
                ) : segment.isDelete ? (
                  <EuiPanel
                    paddingSize="s"
                    hasBorder={false}
                    hasShadow={false}
                    css={{
                      backgroundColor: euiTheme.colors.backgroundBaseSubdued,
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
          })}
        </EuiFlexGrid>
      </EuiPanel>
    </>
  );
};
