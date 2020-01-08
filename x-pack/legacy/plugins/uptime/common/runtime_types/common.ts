/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const LocationType = t.partial({
  lat: t.string,
  lon: t.string,
});

export const CheckGeoType = t.partial({
  name: t.string,
  location: LocationType,
});

export const SummaryType = t.partial({
  up: t.number,
  down: t.number,
  geo: CheckGeoType,
});

export type Summary = t.TypeOf<typeof SummaryType>;
export type CheckGeo = t.TypeOf<typeof CheckGeoType>;
export type Location = t.TypeOf<typeof LocationType>;
