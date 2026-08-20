/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface EcfSectionProps {
  serviceCount: number;
}

export function EcfSection({ serviceCount }: EcfSectionProps) {
  const { euiTheme } = useEuiTheme();
  const contentId = useGeneratedHtmlId({ prefix: 'ecfContent' });
  const [isOpen, setIsOpen] = useState(true);

  const headerButtonCss = css`
    display: block;
    width: 100%;
    text-align: left;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border: none;
    padding: ${euiTheme.size.l} ${euiTheme.size.m};
    cursor: pointer;
    border-bottom: ${isOpen ? `1px solid ${euiTheme.colors.borderBaseSubdued}` : 'none'};
  `;

  return (
    <EuiPanel
      hasBorder
      paddingSize="none"
      style={{ overflow: 'hidden', borderColor: euiTheme.colors.borderBaseSubdued }}
      data-test-subj="ecfSection"
    >
      <button
        type="button"
        css={headerButtonCss}
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen((v) => !v)}
        data-test-subj="ecfSection-headerButton"
      >
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiIcon type="rocket" size="m" color="subdued" aria-hidden />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <strong>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.title"
                  defaultMessage="Elastic Cloud Forwarder"
                />
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.serviceBadge"
                defaultMessage="{count, plural, one {# service} other {# services}}"
                values={{ count: serviceCount }}
              />
            </EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </button>

      {isOpen && (
        <div id={contentId} role="region">
          <EuiPanel paddingSize="m" hasBorder={false} hasShadow={false}>
            <EuiText size="s">
              <p>
                <FormattedMessage
                  id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.description"
                  defaultMessage="Log collection via a single AWS CloudFormation stack — no agents required. Trigger source (S3 or CloudWatch) is configured per service in Service settings. Launch CloudFormation to deploy."
                />
              </p>
            </EuiText>

            <EuiSpacer size="m" />

            <EuiButton
              iconType="external"
              iconSide="right"
              data-test-subj="ecfSection-launchButton"
            >
              <FormattedMessage
                id="xpack.ingestHub.authenticateAndDeployStep.ecfSection.launchButton"
                defaultMessage="Launch CloudFormation"
              />
            </EuiButton>
          </EuiPanel>
        </div>
      )}
    </EuiPanel>
  );
}
