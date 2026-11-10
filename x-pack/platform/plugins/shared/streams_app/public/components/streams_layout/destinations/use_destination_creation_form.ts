/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useForm, useFormState, type UseFormReturn } from 'react-hook-form';
import {
  canSubmitDestinationForm,
  getDestinationCreationFormErrors,
  getVisibleDestinationFormErrors,
} from './destination_form';
import {
  EMPTY_DESTINATION_CREATION_FORM,
  type DestinationCreationFormData,
  type DestinationCreationFormErrors,
} from './types';
import type { Unit } from '../../../services/unit_repository';

export interface DestinationCreationForm {
  methods: UseFormReturn<DestinationCreationFormData>;
  formData: DestinationCreationFormData;
  /** Errors to show, see `getVisibleDestinationFormErrors`. */
  formErrors: DestinationCreationFormErrors;
  canSubmit: boolean;
}

/** Form state for creating a destination; validated against the current unit. */
export const useDestinationCreationForm = ({
  unitDefinition,
}: {
  unitDefinition: Unit;
}): DestinationCreationForm => {
  const methods = useForm<DestinationCreationFormData>({
    defaultValues: EMPTY_DESTINATION_CREATION_FORM,
  });
  const formData = methods.watch();
  const { touchedFields, isSubmitted } = useFormState({ control: methods.control });

  const errors = getDestinationCreationFormErrors({ formData, unitDefinition });

  return {
    methods,
    formData,
    formErrors: getVisibleDestinationFormErrors({ errors, touchedFields, isSubmitted }),
    canSubmit: canSubmitDestinationForm({ formData, unitDefinition }),
  };
};
