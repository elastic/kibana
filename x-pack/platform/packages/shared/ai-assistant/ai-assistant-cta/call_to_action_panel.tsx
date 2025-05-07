/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiCard,
  IconType,
  EuiIcon,
  EuiText,
  type EuiPanelProps,
  type EuiCardProps,
  EuiSpacer,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface CallToActionCardProps
  extends Pick<EuiCardProps, 'title' | 'description' | 'children'>,
    Pick<EuiPanelProps, 'color'> {
  iconType: IconType;
}

export const CallToActionCard = ({
  iconType: type,
  title,
  children,
  color,
  description,
}: CallToActionCardProps) => (
  <EuiCard
    titleElement="span"
    layout="horizontal"
    icon={<EuiIcon size="l" {...{ type, color }} />}
    display={color}
    title={
      <EuiText
        css={({ euiTheme }) =>
          css`
            font-weight: ${euiTheme.font.weight.medium};
          `
        }
      >
        {title}
      </EuiText>
    }
    titleSize="xs"
    description={description}
  >
    {children && <EuiSpacer size="s" />}
    {children}
  </EuiCard>
);
