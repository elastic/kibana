/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FieldSourceNameChange } from '@kbn/index-management-shared-types';

import { useConfig } from '../../config_context';
import type { FormHook } from '../../shared_imports';
import type { Field } from '../../types';

interface FieldFormData extends Field {
  sourceName?: string;
}

export const useFieldRenameForm = () => {
  const {
    value: { showFieldRename, onFieldSourceNameChange },
  } = useConfig();

  const prepareFieldDataForSubmit = (form: FormHook<FieldFormData>): FieldSourceNameChange | undefined => {
    if (!showFieldRename) {
      return undefined;
    }

    const formData = form.getFormData();
    const sourceName = formData.sourceName?.trim() ?? '';
    const renameTo = formData.name?.trim() ?? '';
    const displayName = renameTo || sourceName;

    form.setFieldValue('name', displayName);

    return {
      displayName,
      sourceName: sourceName || displayName,
    };
  };

  const notifyFieldSourceNameChange = (
    change: FieldSourceNameChange | undefined,
    previousDisplayName?: string
  ) => {
    if (!showFieldRename || !onFieldSourceNameChange || !change) {
      return;
    }

    onFieldSourceNameChange({
      ...change,
      previousDisplayName,
    });
  };

  const stripSourceNameFromField = (data: FieldFormData): Field => {
    const { sourceName: _sourceName, ...field } = data;
    return field;
  };

  const hasRequiredFieldIdentity = (form: FormHook<FieldFormData>): boolean => {
    if (!showFieldRename) {
      const name = form.getFields().name.value as string;
      return name.trim() !== '';
    }

    const sourceName = form.getFields().sourceName?.value as string | undefined;
    const renameTo = form.getFields().name.value as string;
    return (sourceName?.trim() ?? '') !== '' || renameTo.trim() !== '';
  };

  return {
    showFieldRename,
    prepareFieldDataForSubmit,
    notifyFieldSourceNameChange,
    stripSourceNameFromField,
    hasRequiredFieldIdentity,
  };
};
