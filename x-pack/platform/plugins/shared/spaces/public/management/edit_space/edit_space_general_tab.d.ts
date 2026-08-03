import React from 'react';
import type { ScopedHistory } from '@kbn/core-application-browser';
import type { KibanaFeature } from '@kbn/features-plugin/common';
import type { Space } from '../../../common';
interface Props {
    space: Space;
    history: ScopedHistory;
    features: KibanaFeature[];
    allowFeatureVisibility: boolean;
    allowSolutionVisibility: boolean;
    reloadWindow: () => void;
}
export declare const EditSpaceSettingsTab: React.FC<Props>;
export {};
