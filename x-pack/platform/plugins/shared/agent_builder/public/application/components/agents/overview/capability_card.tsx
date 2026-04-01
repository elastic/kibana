/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCard, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

export interface CapabilityCardProps {
  count: number;
  title: string;
  description: string;
  emptyDescription: string;
  image?: string;
  href?: string;
  onClick?: () => void;
}

const TEXT_SIZE = '64px';
const CARD_IMAGE_HEIGHT = '112px';

export const CapabilityCard: React.FC<CapabilityCardProps> = ({
  count,
  title,
  description,
  emptyDescription,
  image,
  href,
  onClick,
}) => {
  const { euiTheme } = useEuiTheme();

  if (count === 0) {
    return (
      <EuiCard
        hasBorder
        display="plain"
        paddingSize="none"
        title={title}
        titleElement="h4"
        description={emptyDescription}
        textAlign="left"
        href={href}
        onClick={onClick}
        image={
          <div
            css={css`
              width: 100%;
              height: ${CARD_IMAGE_HEIGHT};
              background-color: ${euiTheme.colors.backgroundBaseSubdued};
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            {image && <img src={image} alt="" width={96} height={96} />}
          </div>
        }
        css={css`
          height: 100%;
          .euiCard__content {
            padding: ${euiTheme.size.base};
          }
          .euiCard__content p {
            color: ${euiTheme.colors.textSubdued};
          }
        `}
      />
    );
  }

  return (
    <EuiCard
      hasBorder
      display="plain"
      paddingSize="m"
      title={title}
      titleElement="h4"
      description={description}
      textAlign="left"
      footer={
        <EuiText
          css={css`
            font-size: ${TEXT_SIZE};
            line-height: 1;
          `}
        >
          {count}
        </EuiText>
      }
      css={css`
        height: 100%;
        .euiCard__content p {
          color: ${euiTheme.colors.textSubdued};
        }
      `}
      href={href}
      onClick={onClick}
    />
  );
};
