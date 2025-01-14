/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty } from '@elastic/eui';
import React from 'react';

import type { IBasePath } from '@kbn/core/server';
import type { CustomBranding } from '@kbn/core-custom-branding-common';
import type { IStaticAssets } from '@kbn/core-http-server';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { PromptPage } from '../prompt_page';

/**
 * Static error page (rendered server-side) when user does not have permission to access the requested page.
 *
 * To trigger this error create a user without any roles and try to login.
 */
export function ResetSessionPage({
  logoutUrl,
  staticAssets,
  basePath,
  customBranding,
}: {
  logoutUrl: string;
  staticAssets: IStaticAssets;
  basePath: IBasePath;
  customBranding: CustomBranding;
}) {
  return (
    <PromptPage
      staticAssets={staticAssets}
      basePath={basePath}
      scriptPaths={['/internal/security/reset_session_page.js']}
      title={i18n.translate('xpack.security.resetSession.title', {
        defaultMessage: 'You do not have permission to access the requested page',
      })}
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
        <EuiButtonEmpty id="goBackButton">
          <FormattedMessage
            id="xpack.security.resetSession.goBackButtonLabel"
            defaultMessage="Go back"
          />
        </EuiButtonEmpty>,
      ]}
      customBranding={customBranding}
    />
  );
}
