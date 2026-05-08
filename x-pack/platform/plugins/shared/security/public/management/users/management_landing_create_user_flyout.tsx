/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import type { FunctionComponent } from 'react';
import React from 'react';

import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import { UserForm } from './edit_user/user_form';

export interface ManagementLandingCreateUserFlyoutProps {
  onClose: () => void;
  core: CoreStart;
}

const flyoutTitleId = 'managementLandingCreateUserFlyoutTitle';

/**
 * Same create-user form as the Users management /create route, in a flyout on Stack Management landing.
 */
export const ManagementLandingCreateUserFlyout: FunctionComponent<
  ManagementLandingCreateUserFlyoutProps
> = ({ onClose, core }) => {
  const usersCaps = core.application.capabilities.users as { save?: boolean } | undefined;
  const canSave = Boolean(usersCaps?.save);

  return (
    <KibanaContextProvider services={core}>
      <EuiFlyout
        type="overlay"
        size="l"
        onClose={onClose}
        aria-labelledby={flyoutTitleId}
        data-test-subj="managementLandingCreateUserFlyout"
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={flyoutTitleId}>
              <FormattedMessage
                id="xpack.security.management.users.createUserPage.title"
                defaultMessage="Create user"
              />
            </h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          {canSave ? (
            <UserForm isNewUser onCancel={onClose} onSuccess={onClose} />
          ) : (
            <EuiCallOut
              title={i18n.translate('xpack.security.management.users.landingFlyout.readOnlyTitle', {
                defaultMessage: 'You cannot create users',
              })}
              color="warning"
              iconType="lock"
            >
              {i18n.translate('xpack.security.management.users.landingFlyout.readOnlyBody', {
                defaultMessage: 'Your role does not include permission to manage users.',
              })}
            </EuiCallOut>
          )}
        </EuiFlyoutBody>
      </EuiFlyout>
    </KibanaContextProvider>
  );
};
