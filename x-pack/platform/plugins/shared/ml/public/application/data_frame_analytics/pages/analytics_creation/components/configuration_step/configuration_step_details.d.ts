import type { FC } from 'react';
import React from 'react';
import type { State } from '../../../analytics_management/hooks/use_create_analytics_form/state';
import { ANALYTICS_STEPS } from '../../page';
interface Props {
    setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
    state: State;
}
export declare const ConfigurationStepDetails: FC<Props>;
export {};
