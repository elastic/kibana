/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, type EuiLinkAnchorProps } from '@elastic/eui';
import type { GetUrlForApp } from './types';

/**
 * An in-app link as a proposal authors it: `/app/<appId>/<path>`, optionally behind a space
 * prefix, never behind the server base path. Protocol-relative (`//host`) and absolute
 * (`https://`, `mailto:`) hrefs do not match and are left untouched.
 */
const APP_HREF = /^(?:\/s\/[^/]+)?\/app\/([^/?#]+)([^]*)$/;

/**
 * Resolves an authored in-app href through `core.application.getUrlForApp`, which prepends the
 * server base path and the current space and honors the app's registered route. The authored
 * space prefix is dropped: a proposal is viewed in the space that raised it, and core adds that
 * space back from the browser's own base path.
 */
export const resolveAppHref = (href: string, getUrlForApp?: GetUrlForApp): string => {
  if (!getUrlForApp) {
    return href;
  }
  const match = APP_HREF.exec(href);
  if (!match) {
    return href;
  }
  const [, appId, path] = match;
  return getUrlForApp(appId, { path });
};

/** Builds the `a` processing component for `EuiMarkdownFormat`, bound to one resolver. */
export const createMarkdownLink = (getUrlForApp?: GetUrlForApp): React.FC<EuiLinkAnchorProps> => {
  const MarkdownLink: React.FC<EuiLinkAnchorProps> = ({ href, children, ...props }) => {
    const resolvedHref = useMemo(
      () => (href === undefined ? href : resolveAppHref(href, getUrlForApp)),
      [href]
    );
    return (
      <EuiLink {...props} href={resolvedHref} target="_blank">
        {children}
      </EuiLink>
    );
  };
  MarkdownLink.displayName = 'ProposalMarkdownLink';
  return MarkdownLink;
};
