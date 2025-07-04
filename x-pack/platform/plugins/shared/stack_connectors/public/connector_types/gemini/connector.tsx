/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  ActionConnectorFieldsProps,
  SimpleConnectorForm,
} from '@kbn/triggers-actions-ui-plugin/public';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import DashboardLink from './dashboard_link';
import { gemini } from './translations';
import { geminiConfig, geminiSecrets } from './constants';

const GeminiConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const [{ id, name }] = useFormData();
  return (
    <>
      <SimpleConnectorForm
        isEdit={isEdit}
        readOnly={readOnly}
        configFormSchema={geminiConfig}
        secretsFormSchema={geminiSecrets}
      />
      {isEdit && <DashboardLink connectorId={id} connectorName={name} selectedProvider={gemini} />}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { GeminiConnectorFields as default };
