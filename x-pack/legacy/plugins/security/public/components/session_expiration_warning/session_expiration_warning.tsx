/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

interface Props {
  onRefreshSession: () => void;
}

export const SessionExpirationWarning = (props: Props) => {
  return (
    <>
      <p>
        <FormattedMessage
          id="xpack.security.components.sessionExpiration.logoutNotification"
          defaultMessage="You will soon be logged out due to inactivity. Click OK to resume."
        />
      </p>
      <div className="eui-textRight">
        <EuiButton
          size="s"
          color="warning"
          onClick={props.onRefreshSession}
          data-test-subj="refreshSessionButton"
        >
          <FormattedMessage
            id="xpack.security.components.sessionExpiration.okButtonText"
            defaultMessage="OK"
          />
        </EuiButton>
      </div>
    </>
  );
};
