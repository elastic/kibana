/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiLink } from '@elastic/eui';
import { LinkAnchor } from '../links';
import type { NavigationLink } from '../types';
import { getKibanaLinkProps } from './utils';

export const LandingLink: React.FC<{
  item: NavigationLink;
  urlState?: string;
  onLinkClick?: (id: string) => void;
}> = React.memo(function LandingLink({ item, urlState, onLinkClick, children }) {
  if (item.externalUrl) {
    // Link outside Kibana
    const linkProps = {
      href: item.externalUrl,
      target: '_blank',
      ...(onLinkClick && { onClick: () => onLinkClick(item.id) }),
    };
    return <EuiLink {...linkProps}>{children}</EuiLink>;
  } else {
    const linkProps = getKibanaLinkProps({ item, urlState, onLinkClick });
    return <LinkAnchor {...linkProps}>{children}</LinkAnchor>;
  }
});
