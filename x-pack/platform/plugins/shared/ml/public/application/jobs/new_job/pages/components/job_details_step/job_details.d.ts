import type { FC } from 'react';
import type { StepProps } from '../step_types';
interface Props extends StepProps {
    advancedExpanded: boolean;
    setAdvancedExpanded: (a: boolean) => void;
    additionalExpanded: boolean;
    setAdditionalExpanded: (a: boolean) => void;
}
export declare const JobDetailsStep: FC<Props>;
export {};
