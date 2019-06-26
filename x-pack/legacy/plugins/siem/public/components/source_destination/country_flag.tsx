/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';

/**
 * Returns the flag for the specified country code, or null if the specified
 * country code could not be converted
 * Example: `US` -> 🇺🇸
 */
export const getFlag = (countryCode: string): string | null =>
  countryCode.length === 2
    ? countryCode
        .toUpperCase()
        .replace(/./g, c => String.fromCharCode(55356, 56741 + c.charCodeAt(0)))
    : null;

/** Renders an emjoi flag for the specified country code */
export const CountryFlag = pure<{
  countryCode: string;
}>(({ countryCode }) => {
  const flag = getFlag(countryCode);

  return flag !== null ? <span data-test-subj="country-flag">{flag}</span> : null;
});
