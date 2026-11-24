/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { SecretMetadata } from '@kbn/secrets';
import {
  getInitialSecretFormValues,
  getSecretFormErrors,
  hasSecretFormChanges,
} from './secret_form';
import type { SecretFormErrors, SecretFormField, SecretFormValues } from './secret_form';

const ALL_FIELDS: readonly SecretFormField[] = ['name', 'value', 'connectorId', 'reference'];

export interface SecretForm {
  isEditing: boolean;
  values: SecretFormValues;
  errors: SecretFormErrors;
  /** Whether there is anything to save. Always true for a new secret. */
  hasChanges: boolean;
  setValue: <TField extends keyof SecretFormValues>(
    field: TField,
    value: SecretFormValues[TField]
  ) => void;
  markTouched: (field: SecretFormField) => void;
  /** A field shows its error once the user has left it, not while they are still typing. */
  isInvalid: (field: SecretFormField) => boolean;
  /**
   * Shows what is wrong in every field, which is what a form submitted half filled needs.
   * Returns whether the form can be saved.
   */
  validate: () => boolean;
}

/** The state of the form that creates a secret, or that edits the secret it is given. */
export const useSecretForm = ({
  secret,
  existingNames,
}: {
  secret?: SecretMetadata;
  existingNames: readonly string[];
}): SecretForm => {
  const isEditing = secret !== undefined;
  const [values, setValues] = useState<SecretFormValues>(() => getInitialSecretFormValues(secret));
  const [touched, setTouched] = useState<ReadonlySet<SecretFormField>>(new Set());

  const errors = useMemo(
    () => getSecretFormErrors({ values, secret, existingNames }),
    [values, secret, existingNames]
  );

  return {
    isEditing,
    values,
    errors,
    hasChanges: hasSecretFormChanges({ values, secret }),
    setValue: (field, value) => setValues((current) => ({ ...current, [field]: value })),
    markTouched: (field) => setTouched((current) => new Set(current).add(field)),
    isInvalid: (field) => touched.has(field) && errors[field] !== undefined,
    validate: () => {
      setTouched(new Set(ALL_FIELDS));
      return Object.keys(errors).length === 0;
    },
  };
};
