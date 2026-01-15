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

interface NoDataEmptyPromptProps {
  createNewRule: () => void;
  children?: React.ReactNode;
}

export const NoDataEmptyPrompt = ({ createNewRule, children }: NoDataEmptyPromptProps) => {
  return (
    <EuiEmptyPrompt
      aria-live="polite"
      title={
        <h2>
          {i18n.translate('xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.title', {
            defaultMessage: 'Partition your data',
          })}
        </h2>
      }
      titleSize="xs"
      body={
        <EuiFlexGroup direction="column" gutterSize="s">
          <EuiFlexItem>
            <EuiText size="s">
              {i18n.translate('xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.body', {
                defaultMessage:
                  'Define how your data is split into streams. You can create partitions yourself, or let Elastic suggest an AI-generated proposal based on your data.',
              })}
            </EuiText>
          </EuiFlexItem>
          <EuiSpacer size="m" />
          {children && <EuiFlexItem>{children}</EuiFlexItem>}
          <EuiSpacer size="s" />
          <EuiFlexItem>
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  size="s"
                  color="text"
                  fill={false}
                  data-test-subj="streamsAppStreamDetailRoutingAddRuleButton"
                  onClick={createNewRule}
                >
                  {i18n.translate(
                    'xpack.streams.streamDetailView.routingTab.noDataEmptyPrompt.manualButton',
                    {
                      defaultMessage: 'Create manually',
                    }
                  )}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiHorizontalRule margin="none" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
