/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

interface Props {
  logoutUrl: string;
}

export function ResetSessionPage({ logoutUrl }: Props) {
  const handleGoBack = () => {
    window.history.back();
  };

  return (
    <EuiPageTemplate data-test-subj="promptPage">
      <EuiPageTemplate.EmptyPrompt
        iconType="warning"
        iconColor="danger"
        title={
          <h2>
            {i18n.translate('xpack.security.resetSession.title', {
              defaultMessage: 'You do not have permission to access the requested page',
            })}
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.security.resetSession.description"
              defaultMessage="Either go back to the previous page or log in as a different user."
            />
          </p>
        }
        actions={[
          <EuiButton color="primary" fill href={logoutUrl} data-test-subj="ResetSessionButton">
            <FormattedMessage
              id="xpack.security.resetSession.logOutButtonLabel"
              defaultMessage="Log in as different user"
            />
          </EuiButton>,
          <EuiButtonEmpty onClick={handleGoBack} data-test-subj="goBackButton">
            <FormattedMessage
              id="xpack.security.resetSession.goBackButtonLabel"
              defaultMessage="Go back"
            />
          </EuiButtonEmpty>,
        ]}
      />
    </EuiPageTemplate>
  );
}

export function renderResetSessionPage(
  services: CoreStart,
  { element }: Pick<AppMountParameters, 'element'>,
  props: Props
) {
  render(services.rendering.addContext(<ResetSessionPage {...props} />), element);

  return () => unmountComponentAtNode(element);
}
