/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiCallOut, EuiButton, EuiSpacer } from '@elastic/eui';

interface Props {
  onResendRequest: () => void;
  statusCode?: string | number;
  message?: string;
}

export const LoadingError: FunctionComponent<Props> = ({
  statusCode,
  message,
  onResendRequest,
}) => {
  return (
    <>
      <EuiSpacer size="s" />

      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesLoadingFailedTitle"
            defaultMessage="Unable to load node data"
          />
        }
        color="danger"
      >
        <p>
          {message} ({statusCode})
        </p>
        <EuiButton onClick={onResendRequest} iconType="refresh" color="danger">
          <FormattedMessage
            id="xpack.indexLifecycleMgmt.editPolicy.nodeAttributesReloadButton"
            defaultMessage="Try again"
          />
        </EuiButton>
      </EuiCallOut>

      <EuiSpacer size="xl" />
    </>
  );
};
