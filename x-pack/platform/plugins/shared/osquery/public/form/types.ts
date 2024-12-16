/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { ReactNode } from 'react';

export interface FormFieldProps<T> {
  name: string;
  label: string | Element;
  labelAppend?: ReactNode;
  helpText?: string | (() => React.ReactNode);
  idAria?: string;
  euiFieldProps?: Record<string, unknown>;
  defaultValue?: T;
  required?: boolean;
  rules?: Record<string, unknown>;
}
