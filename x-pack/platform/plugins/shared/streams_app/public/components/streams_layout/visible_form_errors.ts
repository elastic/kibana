/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

/** Errors the user should see: those of touched fields, or all of them once the form was submitted. */
export const getVisibleFormErrors = <TErrors extends object>({
  errors,
  touchedFields,
  isSubmitted,
  fieldPaths = {},
}: {
  errors: TErrors;
  /** `formState.touchedFields` from react-hook-form. */
  touchedFields: object;
  isSubmitted: boolean;
  /** Inputs that reveal an error, when it isn't named after its input. */
  fieldPaths?: Partial<Record<keyof TErrors, readonly string[]>>;
}): TErrors => {
  if (isSubmitted) {
    return errors;
  }
  const visibleErrors = { ...errors };
  for (const field of Object.keys(errors) as Array<keyof TErrors>) {
    const paths = fieldPaths[field] ?? [String(field)];
    if (!paths.some((path) => Boolean(get(touchedFields, path)))) {
      delete visibleErrors[field];
    }
  }
  return visibleErrors;
};
