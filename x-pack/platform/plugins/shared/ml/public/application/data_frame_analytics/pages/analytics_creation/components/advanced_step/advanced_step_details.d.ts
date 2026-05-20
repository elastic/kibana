import type { FC } from 'react';
import React from 'react';
import type { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import type { ANALYTICS_STEPS } from '../../page';
export interface ListItems {
    title: string;
    description: string | JSX.Element;
}
export declare const AdvancedStepDetails: FC<{
    setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
    state: State;
}>;
