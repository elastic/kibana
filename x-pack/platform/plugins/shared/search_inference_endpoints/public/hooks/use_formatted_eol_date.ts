/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { getModelEOLDate } from '../utils/eis_utils';

/**
 * Returns the model's end-of-life date formatted for the current locale,
 * or null when no EOL date is present in the metadata.
 */
export function useFormattedEOLDate(
  metadata: EisInferenceEndpointMetadata | undefined
): string | null {
  return useMemo(() => {
    const eolDate = getModelEOLDate(metadata);
    return eolDate ? eolDate.format('l') : null;
  }, [metadata]);
}
