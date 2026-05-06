/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import {
  useEuiTheme,
  euiCanAnimate,
  EuiIcon,
  EuiText,
  EuiTitle,
  EuiFlexItem,
  EuiFlexGroup,
  EuiPanel,
  EuiLink,
} from '@elastic/eui';
import { css } from '@emotion/react';

export interface LinkCardProps {
  icon: any | string;
  // icon: EuiIconType | string;
  iconAreaLabel?: string;
  title: any;
  description: any;
  href?: string;
  onClick?: () => void;
  isDisabled?: boolean;
  'data-test-subj'?: string;
}

// Component for rendering a card which links to the Create Job page, displaying an
// icon, card title, description and link.
export const LinkCard: FC<LinkCardProps> = ({
  icon,
  iconAreaLabel,
  title,
  description,
  onClick,
  href,
  isDisabled,
  'data-test-subj': dataTestSubj,
}) => {
  const { euiTheme } = useEuiTheme();

  const linkHrefAndOnClickProps = {
    ...(href ? { href } : {}),
    ...(onClick ? { onClick } : {}),
  };
  return (
    <EuiPanel
      style={{ cursor: isDisabled ? 'not-allowed' : undefined }}
      hasShadow={false}
      hasBorder
      css={css`
        ${euiCanAnimate} {
          transition: transform ${euiTheme.animation.normal}
              ${euiTheme.animation.resistance},
            box-shadow ${euiTheme.animation.normal}
              ${euiTheme.animation.resistance};
        }

        &:hover {
          ${euiCanAnimate} {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08),
              0 1px 3px rgba(0, 0, 0, 0.04);
          }
        }
      `}
    >
      <EuiLink
        style={{
          display: 'block',
          pointerEvents: isDisabled ? 'none' : undefined,
          background: 'transparent',
          outline: 'none',
        }}
        data-test-subj={dataTestSubj}
        color="subdued"
        {...linkHrefAndOnClickProps}
      >
        <EuiFlexGroup gutterSize="s" responsive={true}>
          <EuiFlexItem grow={false} css={{ paddingTop: euiTheme.size.xs }}>
            <EuiIcon size="m" type={icon} aria-label={iconAreaLabel} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="xs">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiText color="subdued" size={'s'}>
              <p>{description}</p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiLink>
    </EuiPanel>
  );
};
