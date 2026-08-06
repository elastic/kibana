/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type {
  ActionConnectorFieldsProps,
  ConfigFieldSchema,
  SecretsFieldSchema,
} from '@kbn/triggers-actions-ui-plugin/public';
import { SimpleConnectorForm } from '@kbn/triggers-actions-ui-plugin/public';

const configFormSchema: ConfigFieldSchema[] = [
  { id: 'host', label: 'Host (IP or IP:port)', isRequired: true },
];

const secretsFormSchema: SecretsFieldSchema[] = [
  { id: 'username', label: 'Username', isRequired: true },
  { id: 'password', label: 'Password', isPasswordField: true, isRequired: false },
  { id: 'sshPrivateKey', label: 'SSH Private Key', isRequired: true, type: 'TEXTAREA' },
];

const SshHostConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
  isEdit,
}) => (
  <SimpleConnectorForm
    isEdit={isEdit}
    readOnly={readOnly}
    configFormSchema={configFormSchema}
    secretsFormSchema={secretsFormSchema}
  />
);

// eslint-disable-next-line import/no-default-export
export { SshHostConnectorFields as default };
