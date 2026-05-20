import React from 'react';
import type { RegistryVarsEntry } from '../../../../../../../common';
import type { UpgradePackagePolicyDryRunResponse } from '../../../../../../../common/types/rest_spec';
export declare const UpgradeStatusCallout: React.FunctionComponent<{
    dryRunData: UpgradePackagePolicyDryRunResponse;
    newSecrets: RegistryVarsEntry[];
}>;
