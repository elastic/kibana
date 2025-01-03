/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext, useState } from 'react';

export interface FormChangesProps {
  /**
   * Number of fields rendered on the page that have changed.
   */
  count: number;

  /**
   * Callback function used by a form field to indicate whether its current value is different to its initial value.
   *
   * @example
   * ```
   * const { report } = useFormChangesContext();
   * const isEqual = formik.values.email === formik.initialValues.email;
   *
   * useEffect(() => report(isEqual), [isEqual]);
   * ```
   */
  report: ReportFunction;
}

export type ReportFunction = (isEqual: boolean) => undefined | RevertFunction;
export type RevertFunction = () => void;

/**
 * Custom React hook that allows tracking changes within a form.
 *
 * @example
 * ```
 * const { count } = useFormChanges(); // Form has {count} unsaved changes
 * ```
 */
export const useFormChanges = (): FormChangesProps => {
  const [count, setCount] = useState(0);

  return {
    count,
    report: (isEqual) => {
      if (!isEqual) {
        setCount((c) => c + 1);
        return () => setCount((c) => c - 1);
      }
    },
  };
};

const FormChangesContext = createContext<FormChangesProps | undefined>(undefined);

export const FormChangesProvider = FormChangesContext.Provider;

/**
 * Custom React hook that returns all @see FormChangesProps state from context.
 *
 * @throws Error if called within a component that isn't a child of a `<FormChanges>` component.
 */
export function useFormChangesContext() {
  const value = useContext(FormChangesContext);

  if (!value) {
    throw new Error(
      'FormChanges context is undefined, please verify you are calling useFormChangesContext() as child of a <FormChanges> component.'
    );
  }

  return value;
}
