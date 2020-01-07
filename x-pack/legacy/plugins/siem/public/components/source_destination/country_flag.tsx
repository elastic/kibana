/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo, useEffect, useState } from 'react';
import { isEmpty } from 'lodash/fp';
import { EuiToolTip } from '@elastic/eui';
import countries from 'i18n-iso-countries';
import countryJson from 'i18n-iso-countries/langs/en.json';

/**
 * Returns the flag for the specified country code, or null if the specified
 * country code could not be converted
 * Example: `US` -> 🇺🇸
 */
export const getFlag = (countryCode: string): string | null =>
  countryCode && countryCode.length === 2
    ? countryCode
        .toUpperCase()
        .replace(/./g, c => String.fromCharCode(55356, 56741 + c.charCodeAt(0)))
    : null;

/** Renders an emoji flag for the specified country code */
export const CountryFlag = memo<{
  countryCode: string;
  displayCountryNameOnHover?: boolean;
}>(({ countryCode, displayCountryNameOnHover = false }) => {
  useEffect(() => {
    if (displayCountryNameOnHover && isEmpty(countries.getNames('en'))) {
      countries.registerLocale(countryJson);
    }
  }, []);
  const flag = getFlag(countryCode);

  if (flag !== null) {
    return displayCountryNameOnHover ? (
      <EuiToolTip content={countries.getName(countryCode, 'en')} position="top">
        <span data-test-subj="country-flag">{flag}</span>
      </EuiToolTip>
    ) : (
      <span data-test-subj="country-flag">{flag}</span>
    );
  }
  return null;
});

CountryFlag.displayName = 'CountryFlag';

/** Renders an emjoi flag with country name for the specified country code */
export const CountryFlagAndName = memo<{
  countryCode: string;
  displayCountryNameOnHover?: boolean;
}>(({ countryCode, displayCountryNameOnHover = false }) => {
  const [localesLoaded, setLocalesLoaded] = useState(false);
  useEffect(() => {
    if (isEmpty(countries.getNames('en'))) {
      countries.registerLocale(countryJson);
    }
    setLocalesLoaded(true);
  }, []);

  const flag = getFlag(countryCode);

  if (flag !== null && localesLoaded) {
    return displayCountryNameOnHover ? (
      <EuiToolTip content={countries.getName(countryCode, 'en')} position="top">
        <span data-test-subj="country-flag">{flag}</span>
      </EuiToolTip>
    ) : (
      <span data-test-subj="country-flag">{`${flag} ${countries.getName(countryCode, 'en')}`}</span>
    );
  }
  return null;
});

CountryFlagAndName.displayName = 'CountryFlagAndName';
