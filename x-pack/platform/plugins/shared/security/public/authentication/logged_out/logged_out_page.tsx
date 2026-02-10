/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiSpacer } from '@elastic/eui';
import React from 'react';
import ReactDOM from 'react-dom';
import { BrowserRouter, useSearchParams } from 'react-router-dom-v5-compat';
import useObservable from 'react-use/lib/useObservable';

import type { AppMountParameters, CustomBrandingStart, IBasePath } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { parseNextURL } from '@kbn/std';

import type { StartServices } from '../..';
import { LOGOUT_REASON_QUERY_STRING_PARAMETER } from '../../../common/constants';
import type { LogoutReason } from '../../../common/types';
import { AuthenticationStatePage, formMessages, renderMessage } from '../components';
interface Props {
  basePath: IBasePath;
  customBranding: CustomBrandingStart;
}

export function LoggedOutPage({ basePath, customBranding }: Props) {
  const customBrandingValue = useObservable(customBranding.customBranding$);
  const [searchParams] = useSearchParams();

  const message =
    formMessages[searchParams.get(LOGOUT_REASON_QUERY_STRING_PARAMETER) as LogoutReason];

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
      {message && renderMessage(message)}
      <EuiSpacer size="l" />
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
    services.rendering.addContext(
      <BrowserRouter>
        <LoggedOutPage {...props} />
      </BrowserRouter>
    ),
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
