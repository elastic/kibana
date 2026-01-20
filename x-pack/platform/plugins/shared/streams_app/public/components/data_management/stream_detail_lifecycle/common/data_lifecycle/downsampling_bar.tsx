/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { capitalize } from 'lodash';
import { getDownsamplingColor, getDownsamplingHoverColor } from '../../helpers/downsampling_colors';
import { getInteractivePanelStyles } from './interactive_panel_styles';
import type { DownsamplingSegment } from './data_lifecycle_segments';

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
}

export const DownsamplingBar = ({ segments, gridTemplateColumns }: DownsamplingBarProps) => {
  const { euiTheme } = useEuiTheme();

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
      <EuiSpacer size="s" />
      <EuiPanel
        hasShadow={false}
        hasBorder={false}
        paddingSize="xs"
        style={{
          backgroundColor: euiTheme.colors.backgroundBaseSubdued,
          borderRadius: euiTheme.border.radius.small,
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
                  <DownsamplingPhaseBar
                    downsample={segment.step}
                    stepNumber={(segment.stepIndex ?? index) + 1}
                    phaseName={segment.phaseName}
                    color={getDownsamplingColor(segment.stepIndex ?? index)}
                    colorHover={getDownsamplingHoverColor(segment.stepIndex ?? index)}
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

interface DownsamplingPhaseBarProps {
  downsample: DownsampleStep;
  stepNumber: number;
  phaseName?: string;
  color?: string;
  colorHover?: string;
}

const DownsamplingPhaseBar = ({
  downsample,
  stepNumber,
  phaseName,
  color,
  colorHover,
}: DownsamplingPhaseBarProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const intervalLabel = downsample.fixed_interval;

  const button = (
    <EuiPanel
      paddingSize="s"
      hasBorder={false}
      hasShadow={false}
      role="button"
      grow
      aria-label={i18n.translate('xpack.streams.streamDetailLifecycle.downsample.ariaLabel', {
        defaultMessage: 'Downsampling step {interval}',
        values: { interval: intervalLabel },
      })}
      data-test-subj={`downsamplingPhase-${intervalLabel}-label`}
      onClick={() => setIsPopoverOpen(!isPopoverOpen)}
      css={getInteractivePanelStyles({
        euiTheme,
        backgroundColor: color ?? euiTheme.colors.backgroundBasePlain,
        hoverBackgroundColor: colorHover ?? euiTheme.colors.backgroundBaseSubdued,
        isPopoverOpen,
        minHeight: '30px',
        fullSize: true,
        extraStyles: {
          display: 'flex',
          alignItems: 'center',
        },
      })}
    >
      <EuiFlexGroup
        direction="column"
        gutterSize="none"
        alignItems="flexStart"
        justifyContent="center"
        css={{ width: '100%' }}
      >
        <EuiText
          size="xs"
          color={euiTheme.colors.plainDark}
          data-test-subj={`downsamplingPhase-${intervalLabel}-interval`}
        >
          <b>
            {downsample.fixed_interval}{' '}
            {i18n.translate('xpack.streams.downsamplingPhaseBar.b.intervalLabel', {
              defaultMessage: 'interval',
            })}
          </b>
        </EuiText>
      </EuiFlexGroup>
    </EuiPanel>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
    >
      <EuiPopoverTitle data-test-subj={`downsamplingPopover-step${stepNumber}-title`}>
        {i18n.translate('xpack.streams.streamDetailLifecycle.downsample.popoverTitle', {
          defaultMessage: 'Downsample step {stepNumber}',
          values: { stepNumber },
        })}
      </EuiPopoverTitle>
      <div
        style={{ width: '300px' }}
        data-test-subj={`downsamplingPopover-step${stepNumber}-content`}
      >
        <EuiSpacer size="s" />
        <EuiFlexGroup direction="column" gutterSize="none">
          {phaseName && (
            <>
              <EuiFlexItem data-test-subj={`downsamplingPopover-step${stepNumber}-definedIn`}>
                <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
                  <EuiFlexItem grow={false}>
                    <EuiText size="s">
                      <strong>
                        {i18n.translate(
                          'xpack.streams.streamDetailLifecycle.downsample.definedIn',
                          {
                            defaultMessage: 'Defined in',
                          }
                        )}
                      </strong>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="s"
                      textAlign="right"
                      data-test-subj={`downsamplingPopover-step${stepNumber}-phaseName`}
                    >
                      {i18n.translate('xpack.streams.streamDetailLifecycle.downsample.phase', {
                        defaultMessage: '{phase} phase',
                        values: {
                          phase: capitalize(phaseName),
                        },
                      })}
                    </EuiText>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiFlexItem data-test-subj={`downsamplingPopover-step${stepNumber}-afterDataStored`}>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate(
                      'xpack.streams.streamDetailLifecycle.downsample.afterDataStored',
                      {
                        defaultMessage: 'After data stored',
                      }
                    )}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  textAlign="right"
                  data-test-subj={`downsamplingPopover-step${stepNumber}-afterValue`}
                >
                  {downsample.after}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiSpacer size="s" />
          <EuiFlexItem data-test-subj={`downsamplingPopover-step${stepNumber}-interval`}>
            <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate(
                      'xpack.streams.streamDetailLifecycle.downsample.downsampleInterval',
                      {
                        defaultMessage: 'Downsample interval',
                      }
                    )}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText
                  size="s"
                  textAlign="right"
                  data-test-subj={`downsamplingPopover-step${stepNumber}-intervalValue`}
                >
                  {downsample.fixed_interval}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};
