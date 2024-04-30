/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Replacements } from '@kbn/elastic-assistant-common';

export interface OptionalRequestParams {
  allow?: string[];
  allowReplacement?: string[];
  replacements?: Replacements;
}

export const getOptionalRequestParams = ({
  allow,
  allowReplacement,
  replacements,
}: OptionalRequestParams): OptionalRequestParams => {
  const optionalAllow = allow ? { allow } : {};
  const optionalAllowReplacement = allowReplacement ? { allowReplacement } : {};
  const optionalReplacements = replacements ? { replacements } : {};

  return {
    ...optionalAllow,
    ...optionalAllowReplacement,
    ...optionalReplacements,
  };
};
