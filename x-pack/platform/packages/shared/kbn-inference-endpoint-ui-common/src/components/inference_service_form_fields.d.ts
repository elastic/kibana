import React from 'react';
import type { InferenceTaskType } from '@elastic/elasticsearch/lib/api/types';
import type { SolutionView } from '@kbn/spaces-plugin/common';
import type { HttpSetup, IToasts } from '@kbn/core/public';
import type { InferenceProvider } from '../types/types';
export declare const buttonCss: import("@emotion/react").SerializedStyles;
export declare const accordionCss: import("@emotion/react").SerializedStyles;
export declare function isProviderForSolutions(filterBySolution: SolutionView, provider: InferenceProvider): boolean;
interface InferenceServicesProps {
    config: {
        isEdit?: boolean;
        enforceAdaptiveAllocations?: boolean;
        currentSolution?: SolutionView;
        isPreconfigured?: boolean;
        allowContextWindowLength?: boolean;
        reenterSecretsOnEdit?: boolean;
        allowTemperature?: boolean;
        /** When set, only these task types will be available for selection in the form. */
        allowedTaskTypes?: InferenceTaskType[];
        /** When set, providers matching these service keys will be hidden from the selectable list. */
        excludeProviders?: string[];
    };
    http: HttpSetup;
    toasts: IToasts;
}
export declare const InferenceServiceFormFields: React.FC<InferenceServicesProps>;
export {};
