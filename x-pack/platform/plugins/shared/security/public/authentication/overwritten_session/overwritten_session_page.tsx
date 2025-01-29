/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

import type { AppMountParameters, IBasePath } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { AuthenticationServiceSetup } from '@kbn/security-plugin-types-public';
import { parseNextURL } from '@kbn/std';

import type { StartServices } from '../..';
import { AuthenticationStatePage } from '../components';

interface Props {
  basePath: IBasePath;
  authc: Pick<AuthenticationServiceSetup, 'getCurrentUser'>;
}

export function OverwrittenSessionPage({ authc, basePath }: Props) {
  const [username, setUsername] = useState<string | null>(null);
  useEffect(() => {
    authc.getCurrentUser().then((user) => setUsername(user.username));
  }, [authc]);

  if (username == null) {
    return null;
  }

  return (
    <AuthenticationStatePage
      title={
        <FormattedMessage
          id="xpack.security.overwrittenSession.title"
          defaultMessage="You previously logged in as a different user."
        />
      }
    >
      <EuiButton href={parseNextURL(window.location.href, basePath.serverBasePath)}>
        <FormattedMessage
          id="xpack.security.overwrittenSession.continueAsUserText"
          defaultMessage="Continue as {username}"
          values={{ username }}
        />
      </EuiButton>
    </AuthenticationStatePage>
  );
}

export function renderOverwrittenSessionPage(
  services: StartServices,
  { element }: Pick<AppMountParameters, 'element'>,
  props: Props
) {
  ReactDOM.render(
    <KibanaRenderContextProvider {...services}>
      <OverwrittenSessionPage {...props} />
    </KibanaRenderContextProvider>,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
}
