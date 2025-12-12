/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import type { FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import type { ConnectorServices } from '../../types';
import { ConnectorProvider } from '../context/connector_context';

interface FormTestProviderProps {
  children: React.ReactNode;
  defaultValue?: Record<string, unknown>;
  onSubmit?: ({ data, isValid }: { data: FormData; isValid: boolean }) => Promise<void>;
  connectorServices?: ConnectorServices;
}

const FormTestProviderComponent: React.FC<FormTestProviderProps> = ({
  children,
  defaultValue,
  onSubmit,
  connectorServices = { validateEmailAddresses: jest.fn(), enabledEmailServices: ['*'] },
}) => {
  const { form } = useForm({ defaultValue });
  const { submit } = form;

  const onClick = useCallback(async () => {
    const res = await submit();
    if (onSubmit) {
      onSubmit(res);
    }
  }, [onSubmit, submit]);

  return (
    <I18nProvider>
      <ConnectorProvider value={{ services: connectorServices }}>
        <Form form={form}>{children}</Form>
        <EuiButton data-test-subj="form-test-provide-submit" onClick={onClick} />
      </ConnectorProvider>
    </I18nProvider>
  );
};

FormTestProviderComponent.displayName = 'FormTestProvider';
export const FormTestProvider = React.memo(FormTestProviderComponent);
