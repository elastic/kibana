import type { ActionDispatchers } from './actions';
import type { State } from './state';
import type { ANALYTICS_STEPS } from '../../../analytics_creation/page';
export interface AnalyticsCreationStep {
    number: ANALYTICS_STEPS;
    completed: boolean;
}
export interface CreateAnalyticsFormProps {
    actions: ActionDispatchers;
    state: State;
}
export interface CreateAnalyticsStepProps extends CreateAnalyticsFormProps {
    setCurrentStep: React.Dispatch<React.SetStateAction<ANALYTICS_STEPS>>;
    step?: ANALYTICS_STEPS;
    stepActivated?: boolean;
}
export declare const useCreateAnalyticsForm: () => CreateAnalyticsFormProps;
