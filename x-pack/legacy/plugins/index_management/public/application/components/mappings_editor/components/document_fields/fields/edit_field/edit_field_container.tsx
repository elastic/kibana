/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useCallback } from 'react';

import { useForm } from '../../../../shared_imports';
import { useDispatch } from '../../../../mappings_state';
import { Field, NormalizedField, NormalizedFields } from '../../../../types';
import { fieldSerializer, fieldDeserializer } from '../../../../lib';
import { EditField } from './edit_field';

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
}

export const EditFieldContainer = React.memo(({ field, allFields }: Props) => {
  const dispatch = useDispatch();

  const { form } = useForm<Field>({
    defaultValue: { ...field.source },
    serializer: fieldSerializer,
    deserializer: fieldDeserializer,
    options: { stripEmptyFields: false },
  });

  useEffect(() => {
    const subscription = form.subscribe(updatedFieldForm => {
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [form]);

  const exitEdit = useCallback(() => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  }, []);

  return <EditField form={form} field={field} allFields={allFields} exitEdit={exitEdit} />;
});
