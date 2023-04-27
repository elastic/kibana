/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EcsMetadata, UnallowedValueRequestItem } from '../../types';

export const hasAllowedValues = ({
  ecsMetadata,
  fieldName,
}: {
  ecsMetadata: Record<string, EcsMetadata> | null;
  fieldName: string;
}): boolean =>
  ecsMetadata != null ? (ecsMetadata[fieldName]?.allowed_values?.length ?? 0) > 0 : false;

export const getValidValues = (field: EcsMetadata | undefined): string[] =>
  field?.allowed_values?.flatMap(({ name }) => (name != null ? name : [])) ?? [];

export const getUnallowedValueRequestItems = ({
  ecsMetadata,
  indexName,
}: {
  ecsMetadata: Record<string, EcsMetadata> | null;
  indexName: string;
}): UnallowedValueRequestItem[] =>
  ecsMetadata != null
    ? Object.keys(ecsMetadata).reduce<UnallowedValueRequestItem[]>(
        (acc, fieldName) =>
          hasAllowedValues({ ecsMetadata, fieldName })
            ? [
                ...acc,
                {
                  indexName,
                  indexFieldName: fieldName,
                  allowedValues: getValidValues(ecsMetadata[fieldName]),
                },
              ]
            : acc,
        []
      )
    : [];
