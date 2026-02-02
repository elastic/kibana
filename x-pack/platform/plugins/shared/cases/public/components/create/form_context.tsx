/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { schema } from './schema';

import type { CasesConfigurationUI } from '../../containers/types';
import type { CasePostRequest } from '../../../common/types/api';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { createFormSerializer, createFormDeserializer, getInitialCaseValue } from './utils';
import type { CaseFormFieldsSchemaProps } from '../case_form_fields/schema';
import { type UseSubmitCaseValue } from './use_submit_case';

export interface FormContextProps {
  children?: JSX.Element | JSX.Element[];
  initialValue?: Pick<CasePostRequest, 'title' | 'description'>;
  currentConfiguration: CasesConfigurationUI;
  selectedOwner: string;
  onSubmitCase: UseSubmitCaseValue['submitCase'];
}

export const FormContext: React.FC<FormContextProps> = ({
  children,
  initialValue,
  currentConfiguration,
  selectedOwner,
  onSubmitCase,
}) => {
  const { data: connectors = [] } = useGetSupportedActionConnectors();

  const { form } = useForm({
    defaultValue: {
      /**
       * This is needed to initiate the connector
       * with the one set in the configuration
       * when creating a case.
       */
      ...getInitialCaseValue({
        owner: selectedOwner,
        connector: currentConfiguration.connector,
      }),
      ...initialValue,
    },
    options: { stripEmptyFields: false },
    schema,
    onSubmit: onSubmitCase,
    serializer: (data: CaseFormFieldsSchemaProps) =>
      createFormSerializer(
        connectors,
        {
          ...currentConfiguration,
          owner: selectedOwner,
        },
        data
      ),
    deserializer: createFormDeserializer,
  });

  return (
    <Form
      onKeyDown={(e: KeyboardEvent) => {
        // It avoids the focus scaping from the flyout when enter is pressed.
        // https://github.com/elastic/kibana/issues/111120
        if (e.key === 'Enter') {
          e.stopPropagation();
        }
      }}
      form={form}
    >
      {children}
    </Form>
  );
};

FormContext.displayName = 'FormContext';
