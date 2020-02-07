/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const UNIT = (totalCount: number) =>
  i18n.translate('xpack.siem.networkTopCountriesTable.heading.unit', {
    values: { totalCount },
    defaultMessage: `{totalCount, plural, =1 {Country} other {Countries}}`,
  });

export const COUNTRY = i18n.translate('xpack.siem.networkTopCountriesTable.column.countryTitle', {
  defaultMessage: 'Country',
});

export const BYTES_IN = i18n.translate('xpack.siem.networkTopCountriesTable.column.bytesInTitle', {
  defaultMessage: 'Bytes in',
});

export const BYTES_OUT = i18n.translate(
  'xpack.siem.networkTopCountriesTable.column.bytesOutTitle',
  {
    defaultMessage: 'Bytes out',
  }
);

export const FLOWS = i18n.translate('xpack.siem.networkTopCountriesTable.column.flows', {
  defaultMessage: 'Flows',
});

export const DESTINATION_COUNTRIES = i18n.translate(
  'xpack.siem.networkTopCountriesTable.heading.destinationCountries',
  {
    defaultMessage: 'Destination countries',
  }
);

export const SOURCE_COUNTRIES = i18n.translate(
  'xpack.siem.networkTopCountriesTable.heading.sourceCountries',
  {
    defaultMessage: 'Source countries',
  }
);

export const DESTINATION_IPS = i18n.translate(
  'xpack.siem.networkTopCountriesTable.column.destinationIps',
  {
    defaultMessage: 'Destination IPs',
  }
);

export const SOURCE_IPS = i18n.translate('xpack.siem.networkTopCountriesTable.column.sourceIps', {
  defaultMessage: 'Source IPs',
});

export const ROWS_5 = i18n.translate('xpack.siem.networkTopCountriesTable.rows', {
  values: { numRows: 5 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});

export const ROWS_10 = i18n.translate('xpack.siem.networkTopCountriesTable.rows', {
  values: { numRows: 10 },
  defaultMessage: '{numRows} {numRows, plural, =0 {rows} =1 {row} other {rows}}',
});
