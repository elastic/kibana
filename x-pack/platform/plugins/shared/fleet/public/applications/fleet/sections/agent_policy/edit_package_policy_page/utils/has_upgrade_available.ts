/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import semverGt from 'semver/functions/gt';

import type { UpgradePackagePolicyDryRunResponse } from '../../../../types';

/**
 * Given a dry run response, determines if a greater version exists in the "proposed"
 * version of the first package policy in the response.
 */
export function hasUpgradeAvailable(dryRunData: UpgradePackagePolicyDryRunResponse) {
  return (
    dryRunData &&
    dryRunData[0].diff &&
    semverGt(
      dryRunData[0].diff[1].package?.version ?? '',
      dryRunData[0].diff[0].package?.version ?? ''
    )
  );
}
