/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ToggleField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import * as i18n from './translations';
import { CredentialsApiUrl } from './credentials_api_url';
import { CredentialsAuth, OAuth } from './auth_types';

interface Props {
  isOAuth: boolean;
  readOnly: boolean;
  isLoading: boolean;
}

const CredentialsComponent: React.FC<Props> = ({ readOnly, isLoading, isOAuth }) => {
  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.SN_INSTANCE_LABEL}</h4>
          </EuiTitle>
          <CredentialsApiUrl readOnly={readOnly} isLoading={isLoading} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTHENTICATION_LABEL}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <UseField
        path="config.isOAuth"
        component={ToggleField}
        config={{ defaultValue: false }}
        componentProps={{
          hasEmptyLabelSpace: true,
          euiFieldProps: {
            label: i18n.IS_OAUTH,
            disabled: readOnly,
          },
        }}
      />
      <EuiSpacer size="l" />
      <EuiFlexItem>
        {isOAuth ? (
          <OAuth readOnly={readOnly} isLoading={isLoading} />
        ) : (
          <CredentialsAuth readOnly={readOnly} isLoading={isLoading} />
        )}
      </EuiFlexItem>
    </>
  );
};

export const Credentials = memo(CredentialsComponent);
