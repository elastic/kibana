/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import { useFormikContext } from 'formik';
import type { FC, PropsWithChildren } from 'react';
import React, { useEffect } from 'react';

import { useFormChangesContext } from './form_changes';

export interface FormLabelProps {
  /**
   * Name of target form field.
   */
  for: string;
}

/**
 * Component that visually indicates whether a field value has changed.
 *
 * @example Renders a dot next to "Email" label when field value changes.
 * ```typescript
 * <Formik>
 *   <FormChanges>
 *     <FormRow label={<FormLabel for="email">Email</FormLabel>}>
 *       <FormField name="email" />
 *     </FormRow>
 *   </FormChanges>
 * </Formik>
 * ```
 *
 * @throws Error if not a child of a `<Formik>` component.
 * @throws Error if not a child of a `<FormChanges>` component.
 */
export const FormLabel: FC<PropsWithChildren<FormLabelProps>> = (props) => {
  const formik = useFormikContext();
  const { report } = useFormChangesContext();

  const meta = formik.getFieldMeta(props.for);
  const isEqual = meta.value === meta.initialValue;

  useEffect(() => report(isEqual), [isEqual]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {props.children} {!isEqual ? <EuiIcon type="dot" color="success" size="s" /> : undefined}
    </>
  );
};
