/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { conversationElementPaddingStyles } from '../conversation.styles';
import { BlastRadiusSummaryPanel } from './blast_radius_summary_panel';

/** Prototype: extend with additional severity presentations */
export type NightshiftWelcomeState = 'critical';

export interface ObservabilityNightshiftWelcomeProps {
  state?: NightshiftWelcomeState;
}

export const ObservabilityNightshiftWelcome: React.FC<ObservabilityNightshiftWelcomeProps> = ({
  state = 'critical',
}) => {
  const { euiTheme } = useEuiTheme();

  if (state !== 'critical') {
    return null;
  }

  return (
    <div
      data-test-subj="agentBuilderObservabilityNightshiftWelcome"
      css={[
        conversationElementPaddingStyles,
        css`
          width: 100%;
          box-sizing: border-box;
        `,
      ]}
    >
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge iconType="moon" color="hollow">
            {i18n.translate('xpack.agentBuilder.observabilityNightshift.modeBadge', {
              defaultMessage: 'NIGHTSHIFT',
            })}
          </EuiBadge>
        </EuiFlexItem>
        <EuiSpacer size="s" />
        <EuiFlexItem grow={false}>
          <EuiFlexGroup
            responsive={false}
            alignItems="center"
            gutterSize="m"
            justifyContent="center"
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="radar" size="l" color="danger" aria-hidden />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m">
                <h2
                  css={css`
                    color: ${euiTheme.colors.dangerText};
                  `}
                >
                  {i18n.translate('xpack.agentBuilder.observabilityNightshift.mainHeading', {
                    defaultMessage: 'Your system requires attention',
                  })}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText
            size="xs"
            color="subdued"
            textAlign="center"
            css={css`
              max-width: 640px;
            `}
          >
            <p>
              {i18n.translate('xpack.agentBuilder.observabilityNightshift.introDescription', {
                defaultMessage:
                  'You are currently in nightshift mode, and our system is detecting more unusual behaviour than normal, review your Blast radius summary and initiate actions.',
              })}
            </p>
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="l" />

      <BlastRadiusSummaryPanel />
    </div>
  );
};
