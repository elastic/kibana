/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { ConnectorFormSchema } from '@kbn/triggers-actions-ui-plugin/public';
import { Credentials } from './credentials';
import { ServiceNowConfig, ServiceNowSecrets } from './types';

const ServiceNowConnectorFieldsNoApp: React.FC<ActionConnectorFieldsProps> = ({
  isEdit,
  readOnly,
}) => {
  const [{ config }] = useFormData<ConnectorFormSchema<ServiceNowConfig, ServiceNowSecrets>>({
    watch: ['config.isOAuth'],
  });
  const { isOAuth = false } = config ?? {};

  return <Credentials readOnly={readOnly} isLoading={false} isOAuth={isOAuth} />;
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFieldsNoApp as default };
