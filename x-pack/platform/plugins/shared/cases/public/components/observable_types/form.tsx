/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import React, { useEffect, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';

import { schema } from './schema';
import { FormFields } from './form_fields';
import type { ObservableTypeConfiguration } from '../../../common/types/domain';
import type { FormState } from '../configure_cases/flyout';

export interface ObservableTypesFormProps {
  onChange: (state: FormState<ObservableTypeConfiguration>) => void;
  initialValue: ObservableTypeConfiguration | null;
}

const FormComponent: React.FC<ObservableTypesFormProps> = ({ onChange, initialValue }) => {
  const defaultValue = useMemo(() => ({ key: uuidv4(), label: '' }), []);

  const { form } = useForm({
    defaultValue: initialValue || defaultValue,
    options: { stripEmptyFields: false },
    schema,
  });

  const { submit, isValid, isSubmitting } = form;

  useEffect(() => {
    if (onChange) {
      onChange({ isValid, submit });
    }
  }, [onChange, isValid, submit]);

  return (
    <Form form={form} data-test-subj="observable-types-form">
      <FormFields isSubmitting={isSubmitting} />
    </Form>
  );
};

FormComponent.displayName = 'ObservableTypesForm ';

export const ObservableTypesForm = React.memo(FormComponent);
