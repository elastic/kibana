/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type {
  EuiButtonEmptyProps,
  EuiButtonIconProps,
  EuiButtonProps,
  EuiLinkAnchorProps,
  EuiListGroupItemProps,
  EuiCardProps,
  EuiBadgeProps,
} from '@elastic/eui';
import {
  EuiLink,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiListGroupItem,
  EuiPanel,
  EuiCard,
  EuiBadge,
} from '@elastic/eui';
import type { EuiPanelProps } from '@elastic/eui/src/components/panel/panel';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useHistory } from 'react-router-dom';
import type { ScopedHistory } from '@kbn/core/public';
import type { CreateHrefOptions, ReactRouterProps } from '.';
import { generateReactRouterProps } from '.';
/**
 * Correctly typed component helpers with React-Router-friendly `href` and `onClick` props
 */

type ReactRouterEuiLinkProps = ReactRouterProps & EuiLinkAnchorProps;
export const EuiLinkTo: React.FC<ReactRouterEuiLinkProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  return (
    <EuiLink
      {...rest}
      {...generateReactRouterProps({
        to,
        onClick,
        shouldNotCreateHref,
        http: services.http,
        navigateToUrl: services.application?.navigateToUrl as any,
        history: history as ScopedHistory,
      })}
    />
  );
};

type ReactRouterEuiButtonProps = ReactRouterProps & EuiButtonProps;
export const EuiButtonTo: React.FC<ReactRouterEuiButtonProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  return (
    <EuiButton
      {...rest}
      {...generateReactRouterProps({
        to,
        onClick,
        shouldNotCreateHref,
        http: services.http,
        navigateToUrl: services.application?.navigateToUrl as (
          path: string,
          options?: CreateHrefOptions | undefined
        ) => Promise<void>,
        history: history as ScopedHistory,
      })}
    />
  );
};

type ReactRouterEuiButtonEmptyProps = ReactRouterProps & EuiButtonEmptyProps;
export const EuiButtonEmptyTo: React.FC<ReactRouterEuiButtonEmptyProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  return (
    <EuiButtonEmpty
      {...rest}
      {...generateReactRouterProps({
        to,
        onClick,
        shouldNotCreateHref,
        http: services.http,
        navigateToUrl: services.application?.navigateToUrl as (
          path: string,
          options?: CreateHrefOptions | undefined
        ) => Promise<void>,
        history: history as ScopedHistory,
      })}
    />
  );
};
type ReactRouterEuiButtonIconProps = ReactRouterProps & EuiButtonIconProps;
export const EuiButtonIconTo: React.FC<ReactRouterEuiButtonIconProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  return (
    <EuiButtonIcon
      {...rest}
      {...generateReactRouterProps({
        to,
        onClick,
        shouldNotCreateHref,
        http: services.http,
        navigateToUrl: services.application?.navigateToUrl as (
          path: string,
          options?: CreateHrefOptions | undefined
        ) => Promise<void>,
        history: history as ScopedHistory,
      })}
    />
  );
};

type ReactRouterEuiPanelProps = ReactRouterProps & EuiPanelProps;
export const EuiPanelTo: React.FC<ReactRouterEuiPanelProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  return (
    <EuiPanel
      {...rest}
      {...generateReactRouterProps({
        to,
        onClick,
        shouldNotCreateHref,
        http: services.http,
        navigateToUrl: services.application?.navigateToUrl as (
          path: string,
          options?: CreateHrefOptions | undefined
        ) => Promise<void>,
        history: history as ScopedHistory,
      })}
    />
  );
};

type ReactRouterEuiCardProps = ReactRouterProps & EuiCardProps;
export const EuiCardTo: React.FC<ReactRouterEuiCardProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  return (
    <EuiCard
      {...rest}
      {...generateReactRouterProps({
        to,
        onClick,
        shouldNotCreateHref,
        http: services.http,
        navigateToUrl: services.application?.navigateToUrl as (
          path: string,
          options?: CreateHrefOptions | undefined
        ) => Promise<void>,
        history: history as ScopedHistory,
      })}
    />
  );
};

type ReactRouterEuiListGroupItemProps = ReactRouterProps & EuiListGroupItemProps;
export const EuiListGroupItemTo: React.FC<ReactRouterEuiListGroupItemProps> = ({
  to,
  onClick,
  shouldNotCreateHref,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  return (
    <EuiListGroupItem
      {...rest}
      {...generateReactRouterProps({
        to,
        onClick,
        shouldNotCreateHref,
        http: services.http,
        navigateToUrl: services.application?.navigateToUrl as (
          path: string,
          options?: CreateHrefOptions | undefined
        ) => Promise<void>,
        history: history as ScopedHistory,
      })}
    />
  );
};

// TODO Right now this only supports the `color` prop of EuiBadgeProps
// Trying to use EuiBadgeProps in its entirety causes a succession of Typescript errors
type ReactRouterEuiBadgeProps = ReactRouterProps & Pick<EuiBadgeProps, 'color'> & { label: string };
export const EuiBadgeTo: React.FC<ReactRouterEuiBadgeProps> = ({
  label,
  onClick,
  shouldNotCreateHref,
  to,
  ...rest
}) => {
  const { services } = useKibana();
  const history = useHistory();
  const routerProps = generateReactRouterProps({
    onClick,
    shouldNotCreateHref,
    to,
    http: services.http,
    navigateToUrl: services.application?.navigateToUrl as (
      path: string,
      options?: CreateHrefOptions | undefined
    ) => Promise<void>,
    history: history as ScopedHistory,
  });

  const badgeProps: EuiBadgeProps = {
    ...rest,
    onClick: routerProps.onClick,
    onClickAriaLabel: label,
  };

  return (
    <EuiBadge {...badgeProps} className="enterpriseSearchEuiBadgeTo">
      {label}
    </EuiBadge>
  );
};
