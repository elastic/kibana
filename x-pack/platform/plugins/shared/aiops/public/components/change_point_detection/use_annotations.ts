/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import type { ChangePointAnnotation } from './change_point_detection_context';

export const useAnnotations = (
  annotations: ChangePointAnnotation[],
  sampleChangePointResponse: ChangePointAnnotation | null
) => {
  return useMemo(() => {
    if (annotations.length > 0) return annotations;
    if (sampleChangePointResponse) return [sampleChangePointResponse];
    return [];
  }, [annotations, sampleChangePointResponse]);
};
