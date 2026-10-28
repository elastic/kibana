/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiLink, type EuiLinkAnchorProps } from '@elastic/eui';
import type { IBasePath } from '@kbn/core-http-browser';
import { addSpaceIdToPath, getSpaceIdFromPath } from '@kbn/core-spaces-common';

/** A root-relative href (`/app/...`), as opposed to protocol-relative (`//host`) or absolute. */
const isRootRelative = (href: string) => href.startsWith('/') && !href.startsWith('//');

/** Whether core already resolved this href: it starts with the server base path. */
const hasServerBasePath = (href: string, serverBasePath: string) =>
  serverBasePath !== '' && (href === serverBasePath || href.startsWith(`${serverBasePath}/`));

/** Splits `/path?query#hash` into the path and whatever follows it, which may be empty. */
const splitPath = (href: string): [path: string, suffix: string] => {
  const query = href.indexOf('?');
  const hash = href.indexOf('#');
  const cut = Math.min(query === -1 ? href.length : query, hash === -1 ? href.length : hash);
  return [href.slice(0, cut), href.slice(cut)];
};

/**
 * Resolves an authored root-relative href against `core.http.basePath`, which the page was served
 * with, so the link honors `server.basePath`. A link authored without a space inherits the
 * current one through `prepend`. A link that names a space keeps it: comments accept arbitrary
 * markdown, so `/s/other/app/dashboards#/view/id` may point at another space on purpose. Core's
 * own space helpers write the default space with no prefix, as core does everywhere else.
 * Absolute and protocol-relative hrefs, and hrefs core already resolved, are left untouched.
 */
export const resolveAppHref = (href: string, basePath?: IBasePath): string => {
  if (!basePath || !isRootRelative(href) || hasServerBasePath(href, basePath.serverBasePath)) {
    return href;
  }
  // The space helpers only understand a bare path; the query and hash ride along unchanged.
  const [path, suffix] = splitPath(href);
  const { spaceId, pathname, hasExplicitSpaceIdentifier } = getSpaceIdFromPath(path);
  const resolved = hasExplicitSpaceIdentifier
    ? addSpaceIdToPath(basePath.serverBasePath, spaceId, pathname)
    : basePath.prepend(path);
  return `${resolved}${suffix}`;
};

/** Builds the `a` processing component for `EuiMarkdownFormat`, bound to one base path. */
export const createMarkdownLink = (basePath?: IBasePath): React.FC<EuiLinkAnchorProps> => {
  const MarkdownLink: React.FC<EuiLinkAnchorProps> = ({ href, children, ...props }) => {
    const resolvedHref = useMemo(
      () => (href === undefined ? href : resolveAppHref(href, basePath)),
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
