/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import {
  EuiLink,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  type EuiLinkButtonProps,
  type EuiLinkAnchorProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { LinkAnchor } from '../links';
import type { NavigationLink } from '../types';
import { getKibanaLinkProps } from './utils';

type LandingLinkProps = EuiLinkAnchorProps &
  EuiLinkButtonProps & {
    item: NavigationLink;
    urlState?: string;
    onLinkClick?: (id: string) => void;
  };

// Renders a link to either an external URL or an internal Kibana URL
export const LandingLink: React.FC<LandingLinkProps> = React.memo(function LandingLink({
  item,
  urlState,
  onLinkClick,
  children,
  ...rest
}) {
  if (item.externalUrl != null) {
    // Link to outside Kibana
    const linkProps: EuiLinkAnchorProps = {
      target: '_blank',
      external: true,
      href: item.externalUrl,
      ...(onLinkClick && !item.disabled && { onClick: () => onLinkClick(item.id) }),
      ...rest,
    };
    return <EuiLink {...linkProps}>{children}</EuiLink>;
  } else {
    // Kibana link
    const linkProps = {
      ...getKibanaLinkProps({ item, urlState, onLinkClick }),
      ...rest,
    };
    return <LinkAnchor {...linkProps}>{children}</LinkAnchor>;
  }
});

interface LandingLinksProps {
  items: NavigationLink[];
  urlState?: string;
  onLinkClick?: (id: string) => void;
}

const useSubLinkStyles = () => {
  const { euiTheme } = useEuiTheme();
  return {
    container: css`
      margin-top: ${euiTheme.size.base};
    `,
  };
};

// Renders a list of links in a column layout
export const LandingColumnLinks: React.FC<LandingLinksProps> = React.memo(
  function LandingColumnLinks({ items, urlState, onLinkClick }) {
    const subLinkStyles = useSubLinkStyles();
    return (
      <EuiFlexGroup gutterSize="none" direction="column" alignItems="flexStart">
        {items.map((subItem) => (
          <EuiFlexItem
            key={subItem.id}
            grow={false}
            css={subLinkStyles.container}
            data-test-subj="LandingSubItem"
          >
            <LandingLink item={subItem} urlState={urlState} onLinkClick={onLinkClick}>
              {subItem.title}
            </LandingLink>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
    );
  }
);
