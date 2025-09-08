/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import {
  ConfigFieldSchema,
  SimpleConnectorForm,
  SecretsFieldSchema,
} from '@kbn/triggers-actions-ui-plugin/public';
import https from 'https';
import { EuiButton } from '@elastic/eui';
import { OAuthGoogleDriveConnector } from '@kbn/stack-connectors-plugin/server/connector_types/oauth_google_drive';
import axios from 'axios';

const configFormSchema: ConfigFieldSchema[] = [];

const secretsFormSchema: SecretsFieldSchema[] = [];

const OAuthGoogleDriveConnectorFields: React.FC<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => {
  return (
    <>
      <SimpleConnectorForm
        isEdit={isEdit}
        readOnly={readOnly}
        configFormSchema={configFormSchema}
        secretsFormSchema={secretsFormSchema}
      />
      <EuiButton onClick={handleAuthenticate} fill> Authenticate </EuiButton>
    </>
  );
};

const handleAuthenticate = async () => {

  
}

// eslint-disable-next-line import/no-default-export
export { OAuthGoogleDriveConnectorFields as default };
