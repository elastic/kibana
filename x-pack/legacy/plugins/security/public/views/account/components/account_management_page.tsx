/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { EuiPage, EuiPageBody, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { SecurityPluginSetup } from '../../../../../../../plugins/security/public';
import { getUserDisplayName, AuthenticatedUser } from '../../../../common/model';
import { ChangePassword } from './change_password';
import { PersonalInfo } from './personal_info';

interface Props {
  securitySetup: SecurityPluginSetup;
}

export const AccountManagementPage = (props: Props) => {
  const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
  useEffect(() => {
    props.securitySetup.authc.getCurrentUser().then(setCurrentUser);
  }, [props]);

  if (!currentUser) {
    return null;
  }

  return (
    <EuiPage>
      <EuiPageBody restrictWidth>
        <EuiPanel>
          <EuiText data-test-subj={'userDisplayName'}>
            <h1>{getUserDisplayName(currentUser)}</h1>
          </EuiText>

          <EuiSpacer size="xl" />

          <PersonalInfo user={currentUser} />

          <ChangePassword user={currentUser} />
        </EuiPanel>
      </EuiPageBody>
    </EuiPage>
  );
};
