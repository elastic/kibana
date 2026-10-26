/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, type EuiLinkAnchorProps } from '@elastic/eui';
import { addSpaceIdToPath } from '@kbn/core-spaces-common';
import type { GetUrlForApp } from './types';

/**
 * An in-app link as a proposal authors it: `/app/<appId>/<path>`, optionally behind a space
 * prefix, never behind the server base path. Protocol-relative (`//host`) and absolute
 * (`https://`, `mailto:`) hrefs do not match and are left untouched.
 */
const APP_HREF = /^(?:\/s\/([^/]+))?\/app\/([^/?#]+)([^]*)$/;

/**
 * A URL as core resolves it: the server base path, the current space's prefix when it is not the
 * default space, then the app route and path. Splits off the base path so an authored space can
 * stand in for the current one.
 */
const RESOLVED_APP_URL = /^(.*?)(?:\/s\/[^/]+)?(\/app\/.*)$/;

/**
 * Resolves an authored in-app href through `core.application.getUrlForApp`, which prepends the
 * server base path and the current space and honors the app's registered route. A link authored
 * without a space inherits the current one. A link that names a space keeps it: comments accept
 * arbitrary markdown, so `/s/other/app/dashboards#/view/id` may point at another space on purpose,
 * and the default space is written with no prefix, as core writes it.
 */
export const resolveAppHref = (href: string, getUrlForApp?: GetUrlForApp): string => {
  if (!getUrlForApp) {
    return href;
  }
  const match = APP_HREF.exec(href);
  if (!match) {
    return href;
  }
  const [, authoredSpace, appId, path] = match;
  const resolved = getUrlForApp(appId, { path });
  if (!authoredSpace) {
    return resolved;
  }
  const resolvedMatch = RESOLVED_APP_URL.exec(resolved);
  if (!resolvedMatch) {
    return resolved;
  }
  const [, serverBasePath, appPath] = resolvedMatch;
  return addSpaceIdToPath(serverBasePath || '/', authoredSpace, appPath);
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
