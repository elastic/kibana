/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EnrichedFieldMetadata } from '../../../../types';

export const getIncompatiableFieldsInSameFamilyCount = (
  enrichedFieldMetadata: EnrichedFieldMetadata[]
): number =>
  enrichedFieldMetadata.filter(
    (x) => !x.isEcsCompliant && x.indexInvalidValues.length === 0 && x.isInSameFamily
  ).length;
