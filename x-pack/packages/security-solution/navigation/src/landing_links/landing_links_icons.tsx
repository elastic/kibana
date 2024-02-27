/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, EuiTitle, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { NavigationLink } from '../types';
import { BetaBadge } from './beta_badge';
import { LandingLink } from './landing_links';

export interface LandingLinksIconsProps {
  items: Readonly<NavigationLink[]>;
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
        <EuiIcon aria-hidden="true" size="xl" type={landingIcon ?? ''} role="presentation" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs" css={styles.title}>
          <EuiFlexGroup gutterSize="none" alignItems="center">
            <EuiFlexItem grow={false}>
              <LandingLink item={item} urlState={urlState} onLinkClick={onLinkClick}>
                {title}
              </LandingLink>
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
        <EuiText size="s">{description}</EuiText>
      </EuiFlexItem>
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
});

const linkIconContainerStyles = css`
  min-width: 22em;
`;
export const LandingLinksIcons: React.FC<LandingLinksIconsProps> = ({
  items,
  urlState,
  onLinkClick,
}) => {
  return (
    <EuiFlexGroup gutterSize="xl" wrap>
      {items.map((item) => (
        <EuiFlexItem key={item.id} grow={false} css={linkIconContainerStyles}>
          <LandingLinkIcon item={item} urlState={urlState} onLinkClick={onLinkClick} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};

// eslint-disable-next-line import/no-default-export
export default LandingLinksIcons;
