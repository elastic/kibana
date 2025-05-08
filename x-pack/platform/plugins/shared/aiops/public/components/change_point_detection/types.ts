/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangePoint, ChangePointAnnotation } from './change_point_detection_context';

export function isRealChangePoint(annotation: ChangePointAnnotation): annotation is ChangePoint {
  return annotation.kind === 'changePoint';
}

export const hasRealChangePoints = (annotations: ChangePointAnnotation[]): boolean => {
  return annotations.some((annotation) => isRealChangePoint(annotation));
};
