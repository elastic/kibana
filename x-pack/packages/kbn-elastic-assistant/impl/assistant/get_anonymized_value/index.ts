/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { invert } from 'lodash/fp';
import { v4 } from 'uuid';

export const getAnonymizedValue = ({
  currentReplacements,
  rawValue,
}: {
  currentReplacements: Record<string, string> | undefined;
  rawValue: string;
}): string => {
  if (currentReplacements != null) {
    const rawValueToReplacement: Record<string, string> = invert(currentReplacements);
    const existingReplacement: string | undefined = rawValueToReplacement[rawValue];

    return existingReplacement != null ? existingReplacement : v4();
  }

  return v4();
};
