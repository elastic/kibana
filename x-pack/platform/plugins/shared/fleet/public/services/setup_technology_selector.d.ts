import React from 'react';
import type { PackageInfo } from '../../common/types';
import { SetupTechnology } from '../../common/types';
export declare const SETUP_TECHNOLOGY_SELECTOR_TEST_SUBJ = "setup-technology-selector";
export declare const SETUP_TECHNOLOGY_SELECTOR_BETA_BADGE_TEST_SUBJ = "setup-technology-selector-beta-badge";
interface SetupTechnologySelectorProps {
    disabled: boolean;
    packageInfo: PackageInfo;
    onSetupTechnologyChange: (value: SetupTechnology) => void;
    allowedSetupTechnologies?: SetupTechnology[];
    setupTechnology?: SetupTechnology;
    isAgentlessDefault?: boolean;
    showBetaBadge?: boolean;
    useDescribedFormGroup?: boolean;
    useCheckableCards?: boolean;
    hideTitle?: boolean;
}
export declare const SetupTechnologySelector: ({ disabled, packageInfo, allowedSetupTechnologies, setupTechnology, onSetupTechnologyChange, isAgentlessDefault, showBetaBadge, useDescribedFormGroup, useCheckableCards, hideTitle, }: SetupTechnologySelectorProps) => React.JSX.Element;
export {};
