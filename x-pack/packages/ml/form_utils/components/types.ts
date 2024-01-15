/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createFormSlice } from '../form_slice';
import type { State } from '../form_slice';

export interface FormTextProps<
  FF extends string,
  FS extends string,
  VN extends string,
  S extends State<FF, FS, VN>
> {
  slice: ReturnType<typeof createFormSlice<FF, FS, VN, S>>;
  field: keyof S['formFields'];
  label: string;
  ariaLabel?: string;
  helpText?: string;
  placeHolder?: string | boolean;
}
