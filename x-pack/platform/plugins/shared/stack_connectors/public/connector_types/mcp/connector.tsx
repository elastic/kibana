/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import React, { useEffect } from 'react';
import { HTTPServiceFields } from './http_service_fields';
import type { ConnectorFormData } from './types';

const MCPConnectorFields: React.FC<ActionConnectorFieldsProps> = ({ readOnly, isEdit }) => {
  const formContext = useFormContext<ConnectorFormData>();

  useEffect(() => {
    const data = formContext.getFormData();

    if (!data.config?.service?.authType) {
      formContext.setFieldValue('config.service.authType', 'none');
    }
  }, [formContext]);

  return <HTTPServiceFields isEdit={isEdit} readOnly={readOnly} />;
};

// eslint-disable-next-line import/no-default-export
export { MCPConnectorFields as default };
