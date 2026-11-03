/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React from 'react';
import { EuiButton, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import type { EuiButtonProps } from '@elastic/eui';
import { reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import { useServices } from '../services';

interface AppLinkProps {
  readonly path: string;
  readonly children: ReactNode;
  readonly 'data-test-subj'?: string;
}

/** Returns `href` and `onClick` props that navigate within the app. */
export function useAppNavigation(path: string) {
  const { history } = useServices();
  return reactRouterNavigate(history, path);
}

/** In-app text link. */
export function AppLink({ path, children, 'data-test-subj': dataTestSubj }: AppLinkProps) {
  return (
    <EuiLink {...useAppNavigation(path)} data-test-subj={dataTestSubj}>
      {children}
    </EuiLink>
  );
}

/** In-app link rendered as a button. */
export function AppButton({
  path,
  children,
  iconType,
  fill,
  empty,
  'data-test-subj': dataTestSubj,
}: AppLinkProps & {
  readonly iconType?: EuiButtonProps['iconType'];
  readonly fill?: boolean;
  readonly empty?: boolean;
}) {
  const navigation = useAppNavigation(path);
  if (empty) {
    return (
      <EuiButtonEmpty {...navigation} iconType={iconType} data-test-subj={dataTestSubj}>
        {children}
      </EuiButtonEmpty>
    );
  }
  return (
    <EuiButton {...navigation} iconType={iconType} fill={fill} data-test-subj={dataTestSubj}>
      {children}
    </EuiButton>
  );
}
