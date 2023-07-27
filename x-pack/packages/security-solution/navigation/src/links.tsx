/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { type MouseEventHandler, type MouseEvent, useCallback } from 'react';
import { EuiButton, EuiLink, type EuiLinkProps } from '@elastic/eui';
import { useGetAppUrl, useNavigateTo } from './navigation';

export interface WrappedLinkProps {
  id: string;
  path?: string;
  urlState?: string;
}

export interface LinkProps {
  onClick: MouseEventHandler;
  href: string;
}

export type GetLinkUrl = (
  params: WrappedLinkProps & {
    absolute?: boolean;
    urlState?: string;
  }
) => string;

export type GetLinkProps = (
  params: WrappedLinkProps & {
    /**
     * Optional `onClick` callback prop.
     * It is composed within the returned `onClick` function to perform extra actions when the link is clicked.
     * It does not override the navigation operation.
     **/
    onClick?: MouseEventHandler;
  }
) => LinkProps;

/**
 * It returns the `url` to use in link `href`.
 */
export const useGetLinkUrl = () => {
  const { getAppUrl } = useGetAppUrl();

  const getLinkUrl = useCallback<GetLinkUrl>(
    ({ id, path = '', absolute = false, urlState }) => {
      const formattedPath = urlState ? formatPath(path, urlState) : path;
      const { appId, deepLinkId } = getAppIdsFromId(id);
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
    ({ id, path, urlState, onClick: onClickProps }) => {
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
          ev.preventDefault();
          navigateTo({ url });
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
): React.FC<Omit<T & WrappedLinkProps, 'href'>> =>
  React.memo(function ({ id, path, urlState, onClick: _onClick, ...rest }) {
    const getLink = useGetLinkProps();
    const { onClick, href } = getLink({ id, path, urlState, onClick: _onClick });
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

export const isExternalId = (id: string): boolean => id.includes(':');

export const getAppIdsFromId = (id: string): { appId?: string; deepLinkId?: string } => {
  if (isExternalId(id)) {
    const [appId, deepLinkId] = id.split(':');
    return { appId, deepLinkId };
  }
  return { deepLinkId: id }; // undefined `appId` for internal Security Solution links
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
