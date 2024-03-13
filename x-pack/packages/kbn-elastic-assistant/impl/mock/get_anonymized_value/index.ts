/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacement } from '@kbn/elastic-assistant-common';

/** This mock returns the reverse of `value` */
export const mockGetAnonymizedValue = ({
  currentReplacements,
  rawValue,
}: {
  currentReplacements: Replacement[] | undefined;
  rawValue: string;
}): Replacement => ({ value: rawValue, uuid: rawValue.split('').reverse().join('') });
