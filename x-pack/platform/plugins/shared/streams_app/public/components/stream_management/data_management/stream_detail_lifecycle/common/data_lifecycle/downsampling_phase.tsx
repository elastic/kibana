/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { DownsampleStep } from '@kbn/streams-schema/src/models/ingest/lifecycle';
import { capitalize } from 'lodash';
import { getInteractivePanelStyles } from './interactive_panel_styles';

interface DownsamplingPhaseProps {
  downsample: DownsampleStep;
  stepNumber: number;
  phaseName?: string;
  color?: string;
  onRemoveStep?: (stepNumber: number) => void;
  onEditStep?: (stepNumber: number, phaseName?: string) => void;
  isBeingEdited?: boolean;
  canManageLifecycle: boolean;
  isEditLifecycleFlyoutOpen?: boolean;
  /** While true, all click interactions are disabled: no popover opens and no navigation occurs. */
  disableInteractions?: boolean;
}

export const DownsamplingPhase = ({
  downsample,
  stepNumber,
  phaseName,
  color,
  onRemoveStep,
  onEditStep,
  isBeingEdited = false,
  canManageLifecycle,
  isEditLifecycleFlyoutOpen = false,
  disableInteractions = false,
}: DownsamplingPhaseProps) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const intervalLabel = downsample.fixed_interval;
  const popoverTitleId = useGeneratedHtmlId({
    prefix: `streamsDownsamplingPopoverTitle-${stepNumber}`,
  });

  const handleEditStep = () => {
    onEditStep?.(stepNumber, phaseName);
    setIsPopoverOpen(false);
  };

  const handleRemoveStep = () => {
    onRemoveStep?.(stepNumber);
    setIsPopoverOpen(false);
  };

  const handleClick = () => {
    if (disableInteractions) {
      return;
    }
    if (isEditLifecycleFlyoutOpen) {
      // When the flyout is open, navigate to the phase tab instead of showing the popover
      onEditStep?.(stepNumber, phaseName);
      return;
    }
    setIsPopoverOpen(!isPopoverOpen);
  };

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
      onClick={handleClick}
      css={getInteractivePanelStyles({
        euiTheme,
        backgroundColor: color ?? euiTheme.colors.backgroundBasePlain,
        isPopoverOpen: isPopoverOpen || isBeingEdited,
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
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            fontWeight: euiTheme.font.weight.semiBold,
          }}
        >
          {downsample.fixed_interval}{' '}
          {i18n.translate('xpack.streams.downsamplingPhaseBar.b.intervalLabel', {
            defaultMessage: 'interval',
          })}
        </EuiText>
      </EuiFlexGroup>
    </EuiPanel>
  );

  return (
    <EuiPopover
      button={button}
      isOpen={isPopoverOpen && !isEditLifecycleFlyoutOpen && !disableInteractions}
      closePopover={() => setIsPopoverOpen(false)}
      anchorPosition="upCenter"
      aria-label={i18n.translate(
        'xpack.streams.streamDetailLifecycle.downsample.popoverAriaLabel',
        {
          defaultMessage: 'Downsample step {stepNumber}',
          values: { stepNumber },
        }
      )}
      aria-labelledby={popoverTitleId}
    >
      <EuiPopoverTitle
        id={popoverTitleId}
        data-test-subj={`downsamplingPopover-step${stepNumber}-title`}
      >
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                {i18n.translate('xpack.streams.streamDetailLifecycle.downsample.popoverTitle', {
                  defaultMessage: 'Downsample step {stepNumber}',
                  values: { stepNumber },
                })}
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiBadge data-test-subj={`downsamplingPopover-step${stepNumber}-ageBadge`}>
                  {downsample.after}
                </EuiBadge>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {canManageLifecycle && (onEditStep || onRemoveStep) && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center">
                {onEditStep && (
                  <EuiFlexItem grow={false}>
                    <EuiButton
                      size="s"
                      minWidth={false}
                      aria-label={i18n.translate(
                        'xpack.streams.streamDetailLifecycle.editDownsampleStep.ariaLabel',
                        {
                          defaultMessage: 'Edit downsample step {stepNumber}',
                          values: { stepNumber },
                        }
                      )}
                      data-test-subj={`downsamplingPopover-step${stepNumber}-editButton`}
                      onClick={handleEditStep}
                    >
                      {i18n.translate(
                        'xpack.streams.streamDetailLifecycle.editDownsampleStepLabel',
                        { defaultMessage: 'Edit' }
                      )}
                    </EuiButton>
                  </EuiFlexItem>
                )}

                {onRemoveStep && (
                  <EuiFlexItem grow={false}>
                    <EuiToolTip
                      content={i18n.translate(
                        'xpack.streams.streamDetailLifecycle.removeDownsampleStep.ariaLabel',
                        {
                          defaultMessage: 'Remove downsample step {stepNumber}',
                          values: { stepNumber },
                        }
                      )}
                      disableScreenReaderOutput
                    >
                      <EuiButtonIcon
                        display="base"
                        iconType="trash"
                        size="s"
                        color="danger"
                        aria-label={i18n.translate(
                          'xpack.streams.streamDetailLifecycle.removeDownsampleStep.ariaLabel',
                          {
                            defaultMessage: 'Remove downsample step {stepNumber}',
                            values: { stepNumber },
                          }
                        )}
                        data-test-subj={`downsamplingPopover-step${stepNumber}-removeButton`}
                        onClick={handleRemoveStep}
                      />
                    </EuiToolTip>
                  </EuiFlexItem>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPopoverTitle>
      <div
        style={{ width: '300px' }}
        data-test-subj={`downsamplingPopover-step${stepNumber}-content`}
      >
        <EuiSpacer size="s" />
        <EuiFlexGrid columns={2} gutterSize="s">
          {phaseName && (
            <>
              <EuiFlexItem data-test-subj={`downsamplingPopover-step${stepNumber}-definedIn`}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('xpack.streams.streamDetailLifecycle.downsample.definedIn', {
                      defaultMessage: 'Defined in',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  size="s"
                  data-test-subj={`downsamplingPopover-step${stepNumber}-phaseName`}
                >
                  {i18n.translate('xpack.streams.streamDetailLifecycle.downsample.phase', {
                    defaultMessage: '{phase} phase',
                    values: { phase: capitalize(phaseName) },
                  })}
                </EuiText>
              </EuiFlexItem>
            </>
          )}

          <EuiFlexItem data-test-subj={`downsamplingPopover-step${stepNumber}-interval`}>
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
          <EuiFlexItem>
            <EuiText
              size="s"
              data-test-subj={`downsamplingPopover-step${stepNumber}-intervalValue`}
            >
              {downsample.fixed_interval}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGrid>
      </div>
    </EuiPopover>
  );
};
