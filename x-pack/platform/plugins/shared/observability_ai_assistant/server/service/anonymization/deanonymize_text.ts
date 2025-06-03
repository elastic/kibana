/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HASH_REGEX } from '../../../common/utils/anonymization/redaction';
import { DetectedEntity, DetectedEntityType } from '../../../common/types';

/**
 * Replaces hash placeholders in text with their original values
 *
 * Takes text containing hash placeholders like "{hash123}" and replaces
 * them with their original values from the provided hash map. Also generates
 * entity metadata for each replaced value.
 *
 * @param contentWithHashes - Text containing hash placeholders
 * @param hashMap - Map of hash values to their original entity information
 * @returns Object containing deanonymized text and detected entities
 */
export function deanonymizeText(
  contentWithHashes: string,
  hashMap: Map<string, { value: string; class_name: string; type: DetectedEntityType }>
) {
  const detectedEntities: DetectedEntity[] = [];
  let unhashedText = '';
  let cursor = 0;

  for (const match of contentWithHashes.matchAll(HASH_REGEX)) {
    const hash = match[0];
    const rep = hashMap.get(hash);
    if (!rep) {
      continue; // keep unknown hash as‑is
    }

    // copy segment before the hash
    unhashedText += contentWithHashes.slice(cursor, match.index!);

    // insert real value & capture span
    const start = unhashedText.length;
    unhashedText += rep.value;
    const end = unhashedText.length;

    detectedEntities.push({
      entity: rep.value,
      class_name: rep.class_name,
      start_pos: start,
      end_pos: end,
      type: rep.type,
      hash,
    });

    cursor = match.index! + hash.length;
  }

  unhashedText += contentWithHashes.slice(cursor);
  return { unhashedText, detectedEntities };
}
