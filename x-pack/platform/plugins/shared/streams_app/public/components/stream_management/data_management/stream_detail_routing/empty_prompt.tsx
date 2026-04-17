/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiEmptyPrompt, EuiButton } from '@elastic/eui';
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
        margin-block: unset;
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
                <PartitioningPanel message={message} />
              </EuiFlexItem>
              <EuiSpacer size="l" />
              <EuiFlexGroup gutterSize="s" justifyContent="center">
                {isAiEnabled && <>{children}</>}

                <div>
                  <CreatePartitionButton createNewRule={createNewRule} />
                </div>
              </EuiFlexGroup>
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
      'Partition this data into child streams based on logical groupings; for example, to apply distinct lifecycles or processing to specific data subsets.',
  }
);

const cardDescriptionManual = i18n.translate(
  'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.cardDescriptionManual',
  {
    defaultMessage: 'Define how your data is split into child streams.',
  }
);
