import React from 'react';
import type { NameOverrides } from './get_model_state';
export declare const ModelStatusIndicator: ({ modelId, configOverrides, }: {
    modelId: string;
    configOverrides?: {
        color?: string;
        names?: NameOverrides;
    };
}) => React.JSX.Element | null;
