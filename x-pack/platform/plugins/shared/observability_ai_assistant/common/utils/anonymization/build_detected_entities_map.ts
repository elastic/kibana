/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DetectedEntityType, Message } from '../../types';

/**
 * Build a map from each entity‐hash to its original value & metadata.
 */
export function buildDetectedEntitiesMap(
  messages: Message[]
): Map<string, { value: string; class_name: string; type: DetectedEntityType }> {
  const map = new Map<string, { value: string; class_name: string; type: DetectedEntityType }>();
  for (const { message } of messages) {
    if (message.role !== 'user') continue;
    message.detected_entities?.forEach((ent) => {
      if (!map.has(ent.hash)) {
        map.set(ent.hash, {
          value: ent.entity,
          class_name: ent.class_name,
          type: ent.type,
        });
      }
    });
  }
  return map;
}
