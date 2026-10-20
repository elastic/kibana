/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Mirrors Fleet's hasVersionSuffix/removeVersionSuffixFromPolicyId (not exported
// from @kbn/fleet-plugin's common entry point). Only strips a trailing
// #<major>.<minor>, since a custom policy id may legitimately contain a
// non-version "#" (e.g. `policy#123`).
const VERSION_SUFFIX_PATTERN = /#\d+\.\d+$/;

export const stripPolicyIdVersionSuffix = (policyId: string): string =>
  VERSION_SUFFIX_PATTERN.test(policyId) ? policyId.slice(0, policyId.lastIndexOf('#')) : policyId;
