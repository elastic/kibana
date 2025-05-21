/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { once } from 'lodash';

import { OUTPUT_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { Output } from '../../../common/types';
import {
  getSavedObjectTypes,
  OUTPUT_ENCRYPTED_FIELDS,
  OUTPUT_INCLUDE_AAD_FIELDS,
} from '../../saved_objects';
import type { OutputSOAttributes } from '../../types';

type Nullable<T> = { [P in keyof T]: T[P] | null };

export const _getFieldsToIncludeEncryptedSO = once(() => {
  const res = new Set<string>([...OUTPUT_ENCRYPTED_FIELDS.values()].map((field) => field.key));

  for (const field of Object.keys(
    getSavedObjectTypes()[OUTPUT_SAVED_OBJECT_TYPE].mappings.properties
  )) {
    if (OUTPUT_INCLUDE_AAD_FIELDS.has(field)) {
      res.add(field);
    }
  }
  return [...res.values()];
});

/**
 * Patch update data to make sure we do not break encrypted field
 * allow_edit and secrets field are not excluded from AAD, we cannot change this anymore,
 * we need to make sure each time those fields are changed encrypted field are changed too.
 */
export function patchUpdateDataWithRequireEncryptedAADFields(
  updateData: Nullable<Partial<OutputSOAttributes>>,
  originalOutput: Output
): Nullable<Partial<OutputSOAttributes>> {
  const encryptedOrIncludedinAADFields = _getFieldsToIncludeEncryptedSO();
  if (!encryptedOrIncludedinAADFields.some((field) => Object.hasOwn(updateData, field))) {
    return updateData;
  }

  for (const field of encryptedOrIncludedinAADFields) {
    if (!Object.hasOwn(updateData, field) && Object.hasOwn(originalOutput, field)) {
      // @ts-expect-error
      updateData[field] = originalOutput[field];
    }
  }

  return updateData;
}
