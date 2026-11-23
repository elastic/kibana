/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';

/** Errors to show: of touched fields, of dirty `revealWhenDirty` fields, or all once submitted. */
export const getVisibleFormErrors = <TErrors extends object>({
  errors,
  touchedFields,
  dirtyFields = {},
  revealWhenDirty = [],
  isSubmitted,
  fieldPaths = {},
}: {
  errors: TErrors;
  /** `formState.touchedFields` from react-hook-form. */
  touchedFields: object;
  dirtyFields?: object;
  /** Errors already final for a partly typed value, so they show before the input is left. */
  revealWhenDirty?: ReadonlyArray<keyof TErrors>;
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
    const isMarkedIn = (fields: object) => paths.some((path) => Boolean(get(fields, path)));
    if (
      !isMarkedIn(touchedFields) &&
      !(revealWhenDirty.includes(field) && isMarkedIn(dirtyFields))
    ) {
      delete visibleErrors[field];
    }
  }
  return visibleErrors;
};
