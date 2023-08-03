/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { LinkAnchor } from '../links';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';
import { getKibanaLinkProps } from './utils';

export interface LandingLinksIconsProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}
export interface LandingLinkIconProps {
  item: NavigationLink;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const useLinkIconStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    title: css`
      min-height: ${euiTheme.size.l};
      margin-top: ${euiTheme.size.m};
      margin-bottom: ${euiTheme.size.xs};
    `,
    description: css`
      max-width: 22em;
    `,
  };
};

export const LandingLinkIcon: React.FC<LandingLinkIconProps> = React.memo(function LandingLinkIcon({
  item,
  urlState,
  onLinkClick,
  children,
}) {
  const styles = useLinkIconStyles();
  const linkProps = getKibanaLinkProps({ item, urlState, onLinkClick });
  const { title, description, landingIcon, isBeta, betaOptions } = item;

  return (
    <EuiFlexGroup
      direction="column"
      alignItems="flexStart"
      gutterSize="none"
      responsive={false}
      data-test-subj="LandingItem"
    >
      <EuiFlexItem grow={false}>
        <LinkAnchor tabIndex={-1} {...linkProps}>
          <EuiIcon aria-hidden="true" size="xl" type={landingIcon ?? ''} role="presentation" />
        </LinkAnchor>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs" css={styles.title}>
          <EuiFlexGroup gutterSize="none" alignItems="center">
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
      <EuiFlexItem grow={false} css={styles.description}>
        <EuiText size="s" color="text">
          {description}
        </EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

const useLinksIconsStyles = () => {
  return {
    container: css`
      min-width: 22em;
    `,
  };
};

export const LandingLinksIcons: React.FC<LandingLinksIconsProps> = ({
  items,
  urlState,
  onLinkClick,
}) => {
  const styles = useLinksIconsStyles();
  return (
    <EuiFlexGroup gutterSize="xl" wrap>
      {items.map((item) => (
        <EuiFlexItem key={item.id} grow={false} css={styles.container}>
          <LandingLinkIcon item={item} urlState={urlState} onLinkClick={onLinkClick} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default LandingLinksIcons;
