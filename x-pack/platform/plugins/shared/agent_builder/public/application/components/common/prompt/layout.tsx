/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { IconType } from '@elastic/eui';
import { EuiEmptyPrompt, EuiImage, EuiText, EuiIcon } from '@elastic/eui';
import { css } from '@emotion/react';

const defaultPromptStyles = css`
  .euiEmptyPrompt__main {
    width: 740px;
  }
`;

export type PromptLayoutVariant = 'default' | 'embeddable';

interface IconProps {
  imageSrc?: string;
  iconType?: IconType;
}

export type PromptLayoutProps = {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  primaryButton: React.ReactNode;
  secondaryButton?: React.ReactNode;
  variant?: PromptLayoutVariant;
} & IconProps;

export const PromptLayout: React.FC<PromptLayoutProps> = ({
  imageSrc,
  iconType,
  title,
  subtitle,
  primaryButton,
  secondaryButton,
  variant = 'default',
}) => {
  const actions = [primaryButton, ...(secondaryButton ? [secondaryButton] : [])];

  const isEmbeddable = variant === 'embeddable';

  let iconContent: React.ReactNode;
  if (imageSrc) {
    iconContent = <EuiImage src={imageSrc} alt="" size="s" />;
  } else if (iconType) {
    iconContent = <EuiIcon type={iconType} size="xxl" />;
  }

  return (
    <EuiEmptyPrompt
      data-test-subj="ErrorPrompt"
      css={isEmbeddable ? undefined : defaultPromptStyles}
      hasShadow={!isEmbeddable}
      color={isEmbeddable ? 'transparent' : 'plain'}
      icon={iconContent}
      title={<h2 data-test-subj="ErrorPromptTitle">{title}</h2>}
      body={
        <EuiText color="subdued" textAlign="center">
          {subtitle}
        </EuiText>
      }
      actions={actions}
    />
  );
};
