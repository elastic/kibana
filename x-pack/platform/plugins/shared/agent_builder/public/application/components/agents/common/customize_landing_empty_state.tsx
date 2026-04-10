/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiImage, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { labels } from '../../../utils/i18n';

const promptStyles = css`
  max-width: 640px;
`;

export interface CustomizeLandingEmptyStateProps {
  illustrationSrc: string;
  title: React.ReactNode;
  description: React.ReactNode;
  learnMoreHref: string;
  learnMoreLabel?: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  footer?: React.ReactNode;
  dataTestSubj?: string;
}

export const CustomizeLandingEmptyState: React.FC<CustomizeLandingEmptyStateProps> = ({
  illustrationSrc,
  title,
  description,
  learnMoreHref,
  learnMoreLabel = labels.customizeLandingEmptyState.learnMore,
  primaryAction,
  secondaryAction,
  footer,
  dataTestSubj = 'customizeLandingEmptyState',
}) => {
  const body = (
    <EuiText size="s" textAlign="center">
      <div>{description}</div>
      <p>
        <EuiLink
          data-test-subj={`${dataTestSubj}LearnMoreLink`}
          href={learnMoreHref}
          target="_blank"
          rel="noopener noreferrer"
        >
          {learnMoreLabel}
        </EuiLink>
      </p>
    </EuiText>
  );

  const actions =
    primaryAction || secondaryAction ? (
      <>
        {primaryAction}
        {secondaryAction}
      </>
    ) : undefined;

  return (
    <EuiEmptyPrompt
      data-test-subj={dataTestSubj}
      css={promptStyles}
      layout="vertical"
      hasShadow={false}
      color="transparent"
      paddingSize="l"
      icon={
        <EuiImage
          data-test-subj={`${dataTestSubj}Illustration`}
          src={illustrationSrc}
          alt=""
          size="l"
        />
      }
      title={<h2>{title}</h2>}
      body={body}
      actions={actions}
      footer={footer}
    />
  );
};
