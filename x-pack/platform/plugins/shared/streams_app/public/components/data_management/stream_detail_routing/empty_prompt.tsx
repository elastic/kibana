/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiEmptyPrompt,
  EuiText,
  EuiButton,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEuiTheme, EuiLoadingSpinner } from '@elastic/eui';
import { css } from '@emotion/react';
import { PartitioningPanel } from './partition_suggestions/partitioning_panel';

interface NoDataEmptyPromptProps {
  createNewRule: () => void;
  isLoading: boolean;
  isAiEnabled: boolean;
  children?: React.ReactNode;
}

const CreatePartitionButton = ({ createNewRule }: { createNewRule: () => void }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      css={css`
        color: ${euiTheme.colors.textPrimary};
      `}
      data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
      iconType="timeline" // TODO: Replace with the "if" icon still not available in EUI
      aria-label={i18n.translate(
        'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.manualButton',
        {
          defaultMessage: 'Create partition',
        }
      )}
      onClick={createNewRule}
    >
      {i18n.translate('xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.manualButton', {
        defaultMessage: 'Create partition',
      })}
    </EuiButton>
  );
};

export const NoDataEmptyPrompt = ({
  createNewRule,
  isLoading,
  isAiEnabled,
  children,
}: NoDataEmptyPromptProps) => {
  const message = isAiEnabled ? cardDescriptionAiEnabled : cardDescriptionManual;

  return (
    <EuiEmptyPrompt
      aria-live="polite"
      css={css`
        margin-top: unset;
      `}
      body={
        <EuiFlexGroup direction="column" gutterSize="s">
          {isLoading ? (
            <EuiFlexItem>
              <EuiLoadingSpinner size="m" />
            </EuiFlexItem>
          ) : (
            <>
              <EuiFlexItem>
                <PartitioningPanel message={message}>
                  {isAiEnabled ? children : <CreatePartitionButton createNewRule={createNewRule} />}
                </PartitioningPanel>
              </EuiFlexItem>
              {isAiEnabled && (
                <>
                  <EuiSpacer size="s" />
                  <EuiFlexItem>
                    <EuiFlexGroup alignItems="center" gutterSize="m">
                      <EuiFlexItem>
                        <EuiHorizontalRule margin="none" />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="s">
                          {i18n.translate(
                            'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.or',
                            {
                              defaultMessage: 'or',
                            }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem>
                        <EuiHorizontalRule margin="none" />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiSpacer size="s" />
                  <EuiFlexItem>
                    <div>
                      <CreatePartitionButton createNewRule={createNewRule} />
                    </div>
                  </EuiFlexItem>
                </>
              )}
            </>
          )}
        </EuiFlexGroup>
      }
    />
  );
};

const cardDescriptionAiEnabled = i18n.translate(
  'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.cardDescription',
  {
    defaultMessage:
      'Define how your data is split into streams. Do it yourself, or let Elastic suggest an AI-generated proposal based on your data.',
  }
);

const cardDescriptionManual = i18n.translate(
  'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.cardDescriptionManual',
  {
    defaultMessage: 'Define how your data is split into child streams.',
  }
);
