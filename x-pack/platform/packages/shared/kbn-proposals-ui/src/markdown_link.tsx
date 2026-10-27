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

/**
 * Resolves an authored root-relative href against `core.http.basePath`, which the page was served
 * with, so the link honors `server.basePath`. A link authored without a space inherits the
 * current one through `prepend`. A link that names a space keeps it: comments accept arbitrary
 * markdown, so `/s/other/app/dashboards#/view/id` may point at another space on purpose. Core's
 * own space helpers write the default space with no prefix, as core does everywhere else.
 * Absolute and protocol-relative hrefs are left untouched.
 */
export const resolveAppHref = (href: string, basePath?: IBasePath): string => {
  if (!basePath || !isRootRelative(href)) {
    return href;
  }
  const { spaceId, pathname, hasExplicitSpaceIdentifier } = getSpaceIdFromPath(href);
  return hasExplicitSpaceIdentifier
    ? addSpaceIdToPath(basePath.serverBasePath, spaceId, pathname)
    : basePath.prepend(href);
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
