import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import type { ExperimentalFeatures, MlFeatures } from '../../../../common/constants/app';
export interface EnabledFeatures {
    showLogsSuppliedConfigurationsInfo: boolean;
    showContextualInsights: boolean;
    showNodeInfo: boolean;
    showMLNavMenu: boolean;
    showLicenseInfo: boolean;
    isADEnabled: boolean;
    isDFAEnabled: boolean;
    isNLPEnabled: boolean;
    showRuleFormV2: boolean;
}
export declare const EnabledFeaturesContext: React.Context<EnabledFeatures>;
interface Props {
    isServerless: boolean;
    mlFeatures: MlFeatures;
    showMLNavMenu?: boolean;
    experimentalFeatures?: ExperimentalFeatures;
}
export declare const EnabledFeaturesContextProvider: FC<PropsWithChildren<Props>>;
export declare function useEnabledFeatures(): EnabledFeatures;
export {};
