/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect, useCallback } from 'react';

import { useForm } from '../../../../shared_imports';
import { useDispatch } from '../../../../mappings_state';
import { Field, NormalizedField, NormalizedFields, DataType } from '../../../../types';
import { fieldSerializer, fieldDeserializer } from '../../../../lib';
import { EditField } from './edit_field';

interface Props {
  field: NormalizedField;
  allFields: NormalizedFields['byId'];
}

export const EditFieldContainer = React.memo(({ field, allFields }: Props) => {
  const [type, setType] = useState<DataType>(field.source.type);
  const dispatch = useDispatch();

  const { form } = useForm<Field>({
    defaultValue: { ...field.source },
    serializer: fieldSerializer,
    deserializer: fieldDeserializer,
    options: { stripEmptyFields: false },
  });

  useEffect(() => {
    const subscription = form.subscribe(updatedFieldForm => {
      setType(updatedFieldForm.data.raw.subType || updatedFieldForm.data.raw.type);
      dispatch({ type: 'fieldForm.update', value: updatedFieldForm });
    });

    return subscription.unsubscribe;
  }, [form]);

  const exitEdit = useCallback(() => {
    dispatch({ type: 'documentField.changeStatus', value: 'idle' });
  }, []);

  return (
    <EditField type={type} form={form} field={field} allFields={allFields} exitEdit={exitEdit} />
  );
});
