/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { isExternalId, LinkAnchor, type WrappedLinkProps } from '../links';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';

export interface LandingLinksIconsProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const useStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    container: css`
      min-width: 22em;
    `,
    title: css`
      margin-top: ${euiTheme.size.m};
      margin-bottom: ${euiTheme.size.s};
    `,
    description: css`
      max-width: 22em;
    `,
  };
};

export const LandingLinksIcons: React.FC<LandingLinksIconsProps> = ({
  items,
  urlState,
  onLinkClick,
}) => {
  const styles = useStyles();
  return (
    <EuiFlexGroup gutterSize="xl" wrap>
      {items.map(({ id, title, description, landingIcon, isBeta, betaOptions, skipUrlState }) => {
        const linkProps: WrappedLinkProps = {
          id,
          ...(!isExternalId(id) && !skipUrlState && { urlState }),
          ...(onLinkClick && { onClick: () => onLinkClick(id) }),
        };
        return (
          <EuiFlexItem key={id} data-test-subj="LandingItem" grow={false} css={styles.container}>
            <EuiFlexGroup
              direction="column"
              alignItems="flexStart"
              gutterSize="none"
              responsive={false}
            >
              <EuiFlexItem grow={false}>
                <LinkAnchor tabIndex={-1} {...linkProps}>
                  <EuiIcon
                    aria-hidden="true"
                    size="xl"
                    type={landingIcon ?? ''}
                    role="presentation"
                  />
                </LinkAnchor>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xxs" css={styles.title}>
                  <EuiFlexGroup gutterSize="none">
                    <EuiFlexItem grow={false}>
                      <LinkAnchor {...linkProps}>
                        <h2>{title}</h2>
                      </LinkAnchor>
                    </EuiFlexItem>
                    {isBeta && (
                      <EuiFlexItem grow={false}>
                        <BetaBadge text={betaOptions?.text} />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem css={styles.description}>
                <EuiText size="s" color="text">
                  {description}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default LandingLinksIcons;
