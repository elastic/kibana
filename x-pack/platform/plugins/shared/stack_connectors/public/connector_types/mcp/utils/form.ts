/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { type HeaderField, HeaderFieldType } from '../types';

export const mergeSecretHeaders = (
  secretHeaderKeys: string[],
  formData: FormData
): HeaderField[] => {
  return [
    ...((formData.__internal__?.headers ?? []) as HeaderField[]),
    ...secretHeaderKeys.map((key) => ({ key, value: '', type: HeaderFieldType.SECRET })),
  ];
};
