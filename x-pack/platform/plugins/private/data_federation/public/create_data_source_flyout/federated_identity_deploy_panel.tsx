/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAccordion,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  useGeneratedHtmlId,
} from '@elastic/eui';

export function FederatedIdentityDeployPanel({
  title,
  description,
  launchUrl,
  launchButtonLabel,
  createsTitle,
  createsItems,
  testSubjPrefix,
}: {
  title: string;
  description: string;
  launchUrl: string;
  launchButtonLabel: string;
  createsTitle: string;
  createsItems: string[];
  testSubjPrefix: string;
}) {
  const createsAccordionId = useGeneratedHtmlId({ prefix: 'federatedIdentityDeployCreates' });
  const { euiTheme } = useEuiTheme();
  /** Each resource is its own thing to take in, so they do not run together. */
  const createsListCss = css`
    li + li {
      margin-block-start: ${euiTheme.size.s};
    }
  `;
  /** Without a border to set it apart, the section needs room of its own. */
  const deployPanelCss = css`
    padding-block: ${euiTheme.size.base};
  `;
  /** A footnote, so it sits below the surrounding headings in weight. */
  const createsTitleCss = css`
    font-weight: ${euiTheme.font.weight.medium};
  `;

  return (
    <EuiPanel
      color="transparent"
      hasShadow={false}
      paddingSize="none"
      css={deployPanelCss}
      data-test-subj={`${testSubjPrefix}DeployPanel`}
    >
      <EuiFlexGroup responsive={false} gutterSize="xl" alignItems="flexStart">
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4>{title}</h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText size="s" color="subdued">
            <p>{description}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            color="primary"
            iconType="popout"
            iconSide="right"
            href={launchUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-test-subj={`${testSubjPrefix}DeployLaunchButton`}
          >
            {launchButtonLabel}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {/*
        The resource list reads better across the whole panel than squeezed
        into the column beside the button.
      */}
      <EuiAccordion
        id={createsAccordionId}
        buttonContent={
          <EuiText size="s" css={createsTitleCss}>
            {createsTitle}
          </EuiText>
        }
        initialIsOpen={false}
        paddingSize="s"
        arrowProps={{ iconSize: 's' }}
        data-test-subj={`${testSubjPrefix}DeployCreatesPanel`}
      >
        <EuiText size="xs" color="subdued" component="div" css={createsListCss}>
          <ol>
            {createsItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </EuiText>
      </EuiAccordion>
    </EuiPanel>
  );
}
