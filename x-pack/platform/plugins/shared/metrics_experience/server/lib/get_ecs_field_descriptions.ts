/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsFlat } from '@elastic/ecs';

export function getEcsFieldDescriptions(fieldNames: string[]): Map<string, string> {
  const ecsMap = new Map<string, string>();

  for (const fieldName of fieldNames) {
    const cleanFieldName = fieldName
      .replaceAll('resource.attributes.', '')
      .replaceAll('attributes.', '');
    const ecsField = (EcsFlat as any)[cleanFieldName];
    if (ecsField && ecsField.short) {
      ecsMap.set(fieldName, ecsField.short);
    }
  }

  return ecsMap;
}
