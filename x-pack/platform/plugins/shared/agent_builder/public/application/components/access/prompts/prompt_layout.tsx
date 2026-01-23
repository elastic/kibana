/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiImage, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';

const defaultPromptStyles = css`
  .euiEmptyPrompt__main {
    width: 740px;
  }
`;

export type PromptLayoutVariant = 'default' | 'embeddable';

export interface PromptLayoutProps {
  imageSrc: string;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  primaryButton: React.ReactNode;
  secondaryButton?: React.ReactNode;
  variant?: PromptLayoutVariant;
}

export const PromptLayout: React.FC<PromptLayoutProps> = ({
  imageSrc,
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  variant = 'default',
}) => {
  const actions = [primaryButton, ...(secondaryButton ? [secondaryButton] : [])];

  const isEmbeddable = variant === 'embeddable';

  return (
    <EuiEmptyPrompt
      css={isEmbeddable ? undefined : defaultPromptStyles}
      hasShadow={!isEmbeddable}
      color={isEmbeddable ? 'transparent' : 'plain'}
      icon={<EuiImage src={imageSrc} alt="" size="s" />}
      title={<h2>{title}</h2>}
      body={
        <EuiText color="subdued" textAlign="center">
          {subtitle}
        </EuiText>
      }
      actions={actions}
    />
  );
};
