/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** This mock returns the reverse of `value` */
export const mockGetAnonymizedValue = ({
  currentReplacements,
  rawValue,
}: {
  currentReplacements: Record<string, string> | undefined;
  rawValue: string;
}): string => rawValue.split('').reverse().join('');
