/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  loginUrl: string;
}

export function UnauthenticatedPage({ loginUrl }: Props) {
  return (
    <EuiPageTemplate data-test-subj="promptPage">
      <EuiPageTemplate.EmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={
          <h2>
            {i18n.translate('xpack.security.unauthenticated.pageTitle', {
              defaultMessage: 'We hit an authentication error',
            })}
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.security.unauthenticated.errorDescription"
              defaultMessage="Try logging in again, and if the problem persists, contact your system administrator."
            />
          </p>
        }
        actions={[
          <EuiButton color="primary" fill href={loginUrl} data-test-subj="logInButton">
            <FormattedMessage
              id="xpack.security.unauthenticated.loginButtonLabel"
              defaultMessage="Log in"
            />
          </EuiButton>,
        ]}
      />
    </EuiPageTemplate>
  );
}

export function renderUnauthenticatedPage(
  services: CoreStart,
  { element }: Pick<AppMountParameters, 'element'>,
  props: Props
) {
  render(services.rendering.addContext(<UnauthenticatedPage {...props} />), element);

  return () => unmountComponentAtNode(element);
}
