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

import type { AppMountParameters, CustomBrandingStart, IBasePath } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { parseNextURL } from '@kbn/std';

import type { StartServices } from '../..';
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
      <EuiButton href={parseNextURL(window.location.href, basePath.serverBasePath)}>
        <FormattedMessage id="xpack.security.loggedOut.login" defaultMessage="Log in" />
      </EuiButton>
    </AuthenticationStatePage>
  );
}

export function renderLoggedOutPage(
  services: StartServices,
  { element }: Pick<AppMountParameters, 'element'>,
  props: Props
) {
  ReactDOM.render(
    <KibanaRenderContextProvider {...services}>
      <LoggedOutPage {...props} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
