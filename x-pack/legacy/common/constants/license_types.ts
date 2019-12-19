/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const LICENSE_TYPE_BASIC = 'basic';
export const LICENSE_TYPE_STANDARD = 'standard';
export const LICENSE_TYPE_GOLD = 'gold';
export const LICENSE_TYPE_PLATINUM = 'platinum';
export const LICENSE_TYPE_ENTERPRISE = 'enterprise';
export const LICENSE_TYPE_TRIAL = 'trial';

export type LicenseType =
  | typeof LICENSE_TYPE_BASIC
  | typeof LICENSE_TYPE_STANDARD
  | typeof LICENSE_TYPE_GOLD
  | typeof LICENSE_TYPE_PLATINUM
  | typeof LICENSE_TYPE_ENTERPRISE
  | typeof LICENSE_TYPE_TRIAL;

// These are ordered from least featureful to most featureful, so we can assume that someone holding
// a license at a particular index cannot access any features unlocked by the licenses that follow it.
export const RANKED_LICENSE_TYPES = [
  LICENSE_TYPE_BASIC,
  LICENSE_TYPE_STANDARD,
  LICENSE_TYPE_GOLD,
  LICENSE_TYPE_PLATINUM,
  LICENSE_TYPE_ENTERPRISE,
  LICENSE_TYPE_TRIAL,
];
