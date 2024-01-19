/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormSlice, State } from '../form_slice';

interface FormElementProps<FF extends string, FS extends string, VN extends string> {
  slice: FormSlice<FF, FS, VN>;
  label: string;
  ariaLabel?: string;
  helpText?: string;
}

export interface FormFieldProp<FF extends string, FS extends string, VN extends string> {
  field: keyof State<FF, FS, VN>['formFields'];
  placeHolder?: string | boolean;
}

export type FormTextProps<
  FF extends string,
  FS extends string,
  VN extends string
> = FormElementProps<FF, FS, VN> & FormFieldProp<FF, FS, VN>;

export interface FormSectionProp<FF extends string, FS extends string, VN extends string> {
  section: keyof State<FF, FS, VN>['formSections'];
  disabled?: boolean;
}

export type FormSectionToggleProps<
  FF extends string,
  FS extends string,
  VN extends string
> = FormElementProps<FF, FS, VN> & FormSectionProp<FF, FS, VN>;
