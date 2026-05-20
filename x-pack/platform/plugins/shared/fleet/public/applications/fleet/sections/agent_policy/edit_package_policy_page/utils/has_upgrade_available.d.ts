import type { UpgradePackagePolicyDryRunResponse } from '../../../../types';
/**
 * Given a dry run response, determines if a greater version exists in the "proposed"
 * version of the first package policy in the response.
 */
export declare function hasUpgradeAvailable(dryRunData: UpgradePackagePolicyDryRunResponse): boolean | undefined;
