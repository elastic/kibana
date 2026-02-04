/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
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
import { getInteractivePanelStyles } from './interactive_panel_styles';

interface DownsamplingPhaseProps {
  downsample: DownsampleStep;
  stepNumber: number;
  phaseName?: string;
  color?: string;
}

export const DownsamplingPhase = ({
  downsample,
  stepNumber,
  phaseName,
  color,
}: DownsamplingPhaseProps) => {
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
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
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
