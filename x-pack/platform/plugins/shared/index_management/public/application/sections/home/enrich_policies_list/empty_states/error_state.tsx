/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButton, EuiPageTemplate, EuiSpacer, EuiText } from '@elastic/eui';
import { useLoadEnrichPolicies } from '../../../../services/api';

export const ErrorState = ({
  error,
  resendRequest,
}: {
  error: {
    error: string;
    message?: string;
  };
  resendRequest: ReturnType<typeof useLoadEnrichPolicies>['resendRequest'];
}) => {
  return (
    <EuiPageTemplate.EmptyPrompt
      color="danger"
      iconType="error"
      data-test-subj="sectionError"
      title={
        <h2>
          <FormattedMessage
            id="xpack.idxMgmt.enrichPolicies.list.errorTitle"
            defaultMessage="Unable to load enrich policies"
          />
        </h2>
      }
      body={
        <>
          <EuiText color="subdued">
            <p className="eui-textBreakWord">{error?.message || error?.error}</p>
          </EuiText>
          <EuiSpacer />
          <EuiButton iconSide="right" onClick={resendRequest} iconType="refresh" color="danger">
            <FormattedMessage
              id="xpack.idxMgmt.enrichPolicies.list.errorReloadButton"
              defaultMessage="Reload"
            />
          </EuiButton>
        </>
      }
    />
  );
};
