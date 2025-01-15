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

import {
  URL_LABEL,
  API_KEY_LABEL,
  ORGANISATION_LABEL,
  ORGANISATION_HELP_TEXT,
} from './translations';

const configFormSchema: ConfigFieldSchema[] = [
  {
    id: 'organisation',
    label: ORGANISATION_LABEL,
    isRequired: false,
    helpText: ORGANISATION_HELP_TEXT,
  },
  { id: 'url', label: URL_LABEL, isUrlField: true },
];

const secretsFormSchema: SecretsFieldSchema[] = [
  { id: 'apiKey', label: API_KEY_LABEL, isPasswordField: true },
];

const TheHiveConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  return (
    <>
      <SimpleConnectorForm
        isEdit={isEdit}
        readOnly={readOnly}
        configFormSchema={configFormSchema}
        secretsFormSchema={secretsFormSchema}
      />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TheHiveConnectorFields as default };
