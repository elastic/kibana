/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Attribution } from '../../../../common/descriptor_types';

export function extractAttributions(markdown: string): Attribution[] {
  const attributions: Attribution[] = [];
  markdown.split('|').forEach((attribution: string) => {
    attribution = attribution.trim();
    // this assumes attribution is plain markdown link
    const extractLink = /\[(.*)\]\((.*)\)/;
    const result = extractLink.exec(attribution);
    if (result && result?.length >= 3 && result[1] && result[2]) {
      attributions.push({
        label: result[1],
        url: result[2],
      });
    }
  });
  return attributions;
}
