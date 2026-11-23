/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { SecretMetadata, WriteSecretParams } from '@kbn/secrets';
import {
  buildWriteSecretParams,
  getInitialSecretFormValues,
  getSecretFormErrors,
} from './secret_form';
import type { SecretFormErrors, SecretFormField, SecretFormValues } from './secret_form';

const ALL_FIELDS: readonly SecretFormField[] = ['name', 'value', 'connectorId', 'reference'];

export interface SecretForm {
  isReplacing: boolean;
  values: SecretFormValues;
  errors: SecretFormErrors;
  setValue: <TField extends keyof SecretFormValues>(
    field: TField,
    value: SecretFormValues[TField]
  ) => void;
  markTouched: (field: SecretFormField) => void;
  /** A field shows its error once the user has left it, not while they are still typing. */
  isInvalid: (field: SecretFormField) => boolean;
  /**
   * Shows what is wrong in every field, which is what a form submitted half filled needs.
   * Returns the request that saves the form, or `undefined` when it has errors.
   */
  submit: () => WriteSecretParams | undefined;
}

/** The state of the form that creates a secret, or that replaces the secret it is given. */
export const useSecretForm = ({
  secret,
  existingNames,
}: {
  secret?: SecretMetadata;
  existingNames: readonly string[];
}): SecretForm => {
  const isReplacing = secret !== undefined;
  const [values, setValues] = useState<SecretFormValues>(() => getInitialSecretFormValues(secret));
  const [touched, setTouched] = useState<ReadonlySet<SecretFormField>>(new Set());

  const errors = useMemo(
    () => getSecretFormErrors({ values, isReplacing, existingNames }),
    [values, isReplacing, existingNames]
  );

  return {
    isReplacing,
    values,
    errors,
    setValue: (field, value) => setValues((current) => ({ ...current, [field]: value })),
    markTouched: (field) => setTouched((current) => new Set(current).add(field)),
    isInvalid: (field) => touched.has(field) && errors[field] !== undefined,
    submit: () => {
      setTouched(new Set(ALL_FIELDS));
      return Object.keys(errors).length > 0
        ? undefined
        : buildWriteSecretParams({ values, isReplacing });
    },
  };
};
