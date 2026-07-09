/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Mirrors Fleet's own `hasVersionSuffix`/`removeVersionSuffixFromPolicyId`
 * (`x-pack/platform/plugins/shared/fleet/common/services/version_specific_policies_utils.ts`),
 * duplicated here because those helpers are not exported from
 * `@kbn/fleet-plugin`'s public `common` entry point.
 *
 * Only strips a trailing `#<major>.<minor>` suffix. A custom Fleet policy id
 * may legitimately contain a `#` that isn't a version suffix (e.g.
 * `policy#123`), and must be left untouched.
 */
const VERSION_SUFFIX_PATTERN = /#\d+\.\d+$/;

export const stripPolicyIdVersionSuffix = (policyId: string): string =>
  VERSION_SUFFIX_PATTERN.test(policyId) ? policyId.slice(0, policyId.lastIndexOf('#')) : policyId;
