/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import useObservable from 'react-use/lib/useObservable';

import type {
  AppMountParameters,
  CoreStart,
  CustomBrandingStart,
  IBasePath,
} from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { parseNext } from '../../../common/parse_next';
import { AuthenticationStatePage } from '../components';

interface Props {
  basePath: IBasePath;
  customBranding: CustomBrandingStart;
}

export function LoggedOutPage({ basePath, customBranding }: Props) {
  const customBrandingValue = useObservable(customBranding.customBranding$);
  return (
    <AuthenticationStatePage
      title={
        <FormattedMessage
          id="xpack.security.loggedOut.title"
          defaultMessage="Successfully logged out"
        />
      }
      logo={customBrandingValue?.logo}
    >
      <EuiButton href={parseNext(window.location.href, basePath.serverBasePath)}>
        <FormattedMessage id="xpack.security.loggedOut.login" defaultMessage="Log in" />
      </EuiButton>
    </AuthenticationStatePage>
  );
}

export function renderLoggedOutPage(
  i18nStart: CoreStart['i18n'],
  { element, theme$ }: Pick<AppMountParameters, 'element' | 'theme$'>,
  props: Props
) {
  ReactDOM.render(
    <i18nStart.Context>
      <KibanaThemeProvider theme$={theme$}>
        <LoggedOutPage {...props} />
      </KibanaThemeProvider>
    </i18nStart.Context>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
