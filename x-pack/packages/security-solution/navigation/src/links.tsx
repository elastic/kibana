/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HTMLAttributeAnchorTarget } from 'react';
import React, { type MouseEventHandler, type MouseEvent, useCallback } from 'react';
import { EuiButton, EuiLink, type EuiLinkProps } from '@elastic/eui';
import { useGetAppUrl, useNavigateTo } from './navigation';

export interface BaseLinkProps {
  id: string;
  path?: string;
  urlState?: string;
  target?: HTMLAttributeAnchorTarget | undefined;
}

export type GetLinkUrlProps = BaseLinkProps & { absolute?: boolean };
export type GetLinkUrl = (params: GetLinkUrlProps) => string;

export type WrappedLinkProps = BaseLinkProps & {
  /**
   * Optional `onClick` callback prop.
   * It is composed within the returned `onClick` function to perform extra actions when the link is clicked.
   * It does not override the navigation action.
   **/
  onClick?: MouseEventHandler;
};
export type GetLinkProps = (
  params: WrappedLinkProps & {
    /**
     * Optional `overrideNavigation` boolean prop.
     * It overrides the default browser navigation action with history navigation using kibana tools.
     * It is `true` by default.
     **/
    overrideNavigation?: boolean;
  }
) => LinkProps;

export interface LinkProps {
  onClick: MouseEventHandler;
  href: string;
}

/**
 * It returns the `url` to use in link `href`.
 */
export const useGetLinkUrl = () => {
  const { getAppUrl } = useGetAppUrl();

  const getLinkUrl = useCallback<GetLinkUrl>(
    ({ id, path: subPath = '', absolute = false, urlState }) => {
      const { appId, deepLinkId, path: mainPath = '' } = getAppIdsFromId(id);
      const path = concatPaths(mainPath, subPath);
      const formattedPath = urlState ? formatPath(path, urlState) : path;
      return getAppUrl({ deepLinkId, appId, path: formattedPath, absolute });
    },
    [getAppUrl]
  );

  return getLinkUrl;
};

/**
 * It returns the `onClick` and `href` props to use in link components based on the` deepLinkId` and `path` parameters.
 */
export const useGetLinkProps = (): GetLinkProps => {
  const getLinkUrl = useGetLinkUrl();
  const { navigateTo } = useNavigateTo();

  const getLinkProps = useCallback<GetLinkProps>(
    ({ id, path, urlState, onClick: onClickProps, overrideNavigation = true }) => {
      const url = getLinkUrl({ id, path, urlState });
      return {
        href: url,
        onClick: (ev: MouseEvent) => {
          if (isModified(ev)) {
            return;
          }
          if (onClickProps) {
            onClickProps(ev);
          }
          if (overrideNavigation) {
            ev.preventDefault();
            navigateTo({ url });
          }
        },
      };
    },
    [getLinkUrl, navigateTo]
  );

  return getLinkProps;
};

/**
 * HOC that wraps any Link component and makes it a navigation Link.
 */
export const withLink = <T extends Partial<LinkProps>>(
  Component: React.ComponentType<T>
): React.FC<Omit<T, keyof LinkProps> & WrappedLinkProps> =>
  React.memo(function WithLink({ id, path, urlState, onClick: _onClick, ...rest }) {
    const getLink = useGetLinkProps();
    const { onClick, href } = getLink({
      id,
      path,
      urlState,
      onClick: _onClick,
      ...(rest.target === '_blank' && { overrideNavigation: false }),
    });
    return <Component onClick={onClick} href={href} {...(rest as unknown as T)} />;
  });

/**
 * Security Solutions internal link button.
 *
 * `<LinkButton deepLinkId={SecurityPageName.hosts} />;`
 */
export const LinkButton = withLink(EuiButton);

/**
 * Security Solutions internal link anchor.
 *
 * `<LinkAnchor deepLinkId={SecurityPageName.hosts} />;`
 */
export const LinkAnchor = withLink<EuiLinkProps>(EuiLink);

// Utils

// External IDs are in the format `appId:deepLinkId` to match the Chrome NavLinks format.
// Internal Security Solution ids are the deepLinkId, the appId is omitted for convenience.
export const isSecurityId = (id: string): boolean => !id.includes(':');

// External links may contain an optional `path` in addition to the `appId` and `deepLinkId`.
// Format: `<appId>:<deepLinkId>/<path>`
export const getAppIdsFromId = (
  id: string
): { appId?: string; deepLinkId?: string; path?: string } => {
  const [linkId, strippedPath] = id.split(/\/(.*)/); // split by the first `/` character
  const path = strippedPath ? `/${strippedPath}` : '';
  if (!isSecurityId(linkId)) {
    const [appId, deepLinkId] = linkId.split(':');
    return { appId, deepLinkId, path };
  }
  return { deepLinkId: linkId, path }; // undefined `appId` for internal Security Solution links
};

export const concatPaths = (path: string | undefined, subPath: string | undefined) => {
  if (path && subPath) {
    return `${path.replace(/\/$/, '')}/${subPath.replace(/^\//, '')}`;
  }
  return path || subPath || '';
};

export const formatPath = (path: string, urlState: string) => {
  const urlStateClean = urlState.replace('?', '');
  const [urlPath, parameterPath] = path.split('?');
  let queryParams = '';
  if (urlStateClean && parameterPath) {
    queryParams = `?${parameterPath}&${urlStateClean}`;
  } else if (parameterPath) {
    queryParams = `?${parameterPath}`;
  } else if (urlStateClean) {
    queryParams = `?${urlStateClean}`;
  }
  return `${urlPath}${queryParams}`;
};

export const isModified = (event: MouseEvent) =>
  event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
