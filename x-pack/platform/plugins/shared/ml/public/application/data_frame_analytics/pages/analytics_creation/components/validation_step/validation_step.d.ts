import type { FC } from 'react';
import React from 'react';
import type { CalloutMessage } from '@kbn/ml-validators';
import { ANALYTICS_STEPS } from '../../page';
interface Props {
    setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
    checksInProgress: boolean;
    validationMessages: CalloutMessage[];
}
export declare const ValidationStep: FC<Props>;
export {};
