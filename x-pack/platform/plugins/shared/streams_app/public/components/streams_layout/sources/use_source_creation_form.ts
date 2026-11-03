/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';
import { useForm, useFormState, type UseFormReturn } from 'react-hook-form';
import { defaultSignalsForSourceType } from './source_models';
import {
  canSubmitSourceForm,
  getSourceCreationFormErrors,
  type SourceCreationFormData,
  type SourceCreationFormErrors,
} from './source_form';
import type { SourceType } from './types';
import { getVisibleFormErrors } from '../visible_form_errors';
import type { Unit } from '../../../services/unit_repository';

const FALLBACK_SOURCE_TYPE: SourceType = 'async_bulk';

const getDefaultValues = (sourceType: SourceType): SourceCreationFormData => ({
  sourceType,
  sourceName: '',
  signals: defaultSignalsForSourceType(sourceType),
});

export interface SourceCreationForm {
  methods: UseFormReturn<SourceCreationFormData>;
  formData: SourceCreationFormData;
  /** Errors of touched fields, or all of them once submitted. */
  formErrors: SourceCreationFormErrors;
  canSubmit: boolean;
  /** Switches the type and resets the signals to its defaults. */
  selectSourceType: (sourceType: SourceType) => void;
}

/** Form state for creating a source; validated against the current unit. */
export const useSourceCreationForm = ({
  unitDefinition,
  availableSourceTypes,
}: {
  unitDefinition: Unit;
  availableSourceTypes: readonly SourceType[];
}): SourceCreationForm => {
  const methods = useForm<SourceCreationFormData>({
    defaultValues: getDefaultValues(availableSourceTypes[0] ?? FALLBACK_SOURCE_TYPE),
  });
  const { setValue } = methods;
  const formData = methods.watch();
  const { touchedFields, isSubmitted } = useFormState({ control: methods.control });

  const selectSourceType = (sourceType: SourceType) => {
    setValue('sourceType', sourceType, { shouldDirty: true });
    setValue('signals', defaultSignalsForSourceType(sourceType), { shouldDirty: true });
  };

  // The source environment can load after the modal opens and rule out the default type.
  const { sourceType } = formData;
  const [firstAvailableSourceType] = availableSourceTypes;
  useEffect(() => {
    if (firstAvailableSourceType && !availableSourceTypes.includes(sourceType)) {
      setValue('sourceType', firstAvailableSourceType);
      setValue('signals', defaultSignalsForSourceType(firstAvailableSourceType));
    }
  }, [availableSourceTypes, firstAvailableSourceType, setValue, sourceType]);

  return {
    methods,
    formData,
    formErrors: getVisibleFormErrors({
      errors: getSourceCreationFormErrors({ formData, unitDefinition }),
      touchedFields,
      isSubmitted,
    }),
    canSubmit: canSubmitSourceForm({ formData, unitDefinition, availableSourceTypes }),
    selectSourceType,
  };
};
