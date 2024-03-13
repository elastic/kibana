/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 } from 'uuid';
import { Replacement } from '../../schemas';

export const getAnonymizedValue = ({
  currentReplacements,
  rawValue,
}: {
  currentReplacements: Replacement[] | undefined;
  rawValue: string;
}): Replacement => {
  const uuid = v4().toString();

  if (currentReplacements != null) {
    const rawValueToReplacement = currentReplacements.find((r) => r.value === rawValue);
    const existingReplacement: Replacement | undefined = rawValueToReplacement;

    return existingReplacement != null ? existingReplacement : { uuid, value: rawValue };
  }

  return { uuid, value: rawValue };
};
