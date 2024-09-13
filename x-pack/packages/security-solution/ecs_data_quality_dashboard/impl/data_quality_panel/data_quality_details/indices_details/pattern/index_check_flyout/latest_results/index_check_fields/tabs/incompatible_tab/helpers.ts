/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapeNewlines } from '../../../../../../../../utils/markdown';
import type { EcsBasedFieldMetadata } from '../../../../../../../../types';
import { getIsInSameFamily } from '../../../../../../../../utils/get_is_in_same_family';

export const showInvalidCallout = (ecsBasedFieldMetadata: EcsBasedFieldMetadata[]): boolean =>
  ecsBasedFieldMetadata.length > 0;

export const getIncompatibleMappingsFields = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): string[] =>
  ecsBasedFieldMetadata.reduce<string[]>((acc, x) => {
    if (
      !x.isEcsCompliant &&
      x.type !== x.indexFieldType &&
      !getIsInSameFamily({ ecsExpectedType: x.type, type: x.indexFieldType })
    ) {
      const field = escapeNewlines(x.indexFieldName);
      if (field != null) {
        return [...acc, field];
      }
    }
    return acc;
  }, []);

export const getSameFamilyFields = (ecsBasedFieldMetadata: EcsBasedFieldMetadata[]): string[] =>
  ecsBasedFieldMetadata.reduce<string[]>((acc, x) => {
    if (!x.isEcsCompliant && x.type !== x.indexFieldType && x.isInSameFamily) {
      const field = escapeNewlines(x.indexFieldName);
      if (field != null) {
        return [...acc, field];
      }
    }
    return acc;
  }, []);

export const getIncompatibleValuesFields = (
  ecsBasedFieldMetadata: EcsBasedFieldMetadata[]
): string[] =>
  ecsBasedFieldMetadata.reduce<string[]>((acc, x) => {
    if (!x.isEcsCompliant && x.indexInvalidValues.length > 0) {
      const field = escapeNewlines(x.indexFieldName);
      if (field != null) {
        return [...acc, field];
      }
    }
    return acc;
  }, []);
